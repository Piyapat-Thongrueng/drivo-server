import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import { db } from "../db";
import {
  bookings,
  branches,
  cars,
  countries,
  payments,
  users,
} from "../db/schema";
import { FLEET_BOOKED_STATUSES } from "../config/dashboard.constants";
import type { DateRange } from "../utils/dashboard-dates";
import {
  computeTotalRevenue,
  mergeAmountsByCurrency,
  type CurrencyAmountMap,
} from "../utils/dashboard-aggregates";
import type {
  DailyRevenueBucket,
  DashboardStatCounts,
  FleetByBranchRow,
  RecentBookingRow,
  RevenueBreakdownRow,
  RevenueByCurrencyRow,
} from "../types/report";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function countBookingsCreatedInRange(range: DateRange): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(bookings)
    .where(
      and(
        gte(bookings.createdAt, range.from),
        lte(bookings.createdAt, range.to),
      ),
    );
  return Number(row?.value ?? 0);
}

function mapToRevenueRows(
  rental: CurrencyAmountMap,
  deposit: CurrencyAmountMap,
  damage: CurrencyAmountMap,
): RevenueByCurrencyRow[] {
  const currencies = new Set([
    ...Object.keys(rental),
    ...Object.keys(deposit),
    ...Object.keys(damage),
  ]);
  return [...currencies].sort().map((currency) => {
    const r = rental[currency] ?? "0.00";
    const d = deposit[currency] ?? "0.00";
    const dmg = damage[currency] ?? "0.00";
    return {
      currency,
      rental: r,
      deposit: d,
      damage: dmg,
      total: computeTotalRevenue(r, dmg),
    };
  });
}

// ─── Stat cards ───────────────────────────────────────────────────────────────

async function getStatCounts(
  todayRange: DateRange,
  yesterdayRange: DateRange,
): Promise<DashboardStatCounts> {
  const [
    bookingsToday,
    bookingsYesterday,
    pendingRow,
    activeRow,
    completedRow,
  ] = await Promise.all([
    countBookingsCreatedInRange(todayRange),
    countBookingsCreatedInRange(yesterdayRange),
    db
      .select({ value: count() })
      .from(bookings)
      .where(eq(bookings.status, "pending_approval")),
    db
      .select({ value: count() })
      .from(bookings)
      .where(eq(bookings.status, "active")),
    db
      .select({ value: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "completed"),
          gte(bookings.completedAt, todayRange.from),
          lte(bookings.completedAt, todayRange.to),
        ),
      ),
  ]);

  return {
    bookingsToday,
    bookingsTodayDelta: bookingsToday - Number(bookingsYesterday),
    pendingApproval: Number(pendingRow[0]?.value ?? 0),
    activeRentals: Number(activeRow[0]?.value ?? 0),
    completedToday: Number(completedRow[0]?.value ?? 0),
  };
}

// ─── Revenue by currency ──────────────────────────────────────────────────────

async function sumPaidPaymentsInRange(
  paymentType: "rental" | "deposit",
  range: DateRange,
): Promise<CurrencyAmountMap> {
  const rows = await db
    .select({
      currency: payments.currencyCode,
      amount: payments.amount,
    })
    .from(payments)
    .where(
      and(
        eq(payments.paymentType, paymentType),
        eq(payments.status, "paid"),
        gte(payments.paidAt, range.from),
        lte(payments.paidAt, range.to),
      ),
    );

  return mergeAmountsByCurrency(
    rows.map((r) => ({
      currency: String(r.currency).trim(),
      amount: String(r.amount),
    })),
  );
}

async function sumDamageInRange(range: DateRange): Promise<CurrencyAmountMap> {
  const rows = await db
    .select({
      currency: bookings.currencyCode,
      amount: bookings.damageCharge,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "completed"),
        gte(bookings.completedAt, range.from),
        lte(bookings.completedAt, range.to),
      ),
    );

  return mergeAmountsByCurrency(
    rows.map((r) => ({
      currency: String(r.currency).trim(),
      amount: String(r.amount),
    })),
  );
}

async function getRevenueByCurrency(
  range: DateRange,
): Promise<RevenueByCurrencyRow[]> {
  const [rental, deposit, damage] = await Promise.all([
    sumPaidPaymentsInRange("rental", range),
    sumPaidPaymentsInRange("deposit", range),
    sumDamageInRange(range),
  ]);
  return mapToRevenueRows(rental, deposit, damage);
}

// ─── Daily revenue buckets (chart) ────────────────────────────────────────────

async function getRevenueDailyBuckets(
  range: DateRange,
  tz: string,
): Promise<DailyRevenueBucket[]> {
  // ใช้ date ใน TZ สำหรับ group รายวัน
  const rentalRows = await db
    .select({
      day: sql<string>`to_char(${payments.paidAt} AT TIME ZONE ${sql.raw(`'${tz}'`)}, 'YYYY-MM-DD')`,
      currency: payments.currencyCode,
      amount: payments.amount,
    })
    .from(payments)
    .where(
      and(
        eq(payments.paymentType, "rental"),
        eq(payments.status, "paid"),
        gte(payments.paidAt, range.from),
        lte(payments.paidAt, range.to),
      ),
    );

  const damageRows = await db
    .select({
      day: sql<string>`to_char(${bookings.completedAt} AT TIME ZONE ${sql.raw(`'${tz}'`)}, 'YYYY-MM-DD')`,
      currency: bookings.currencyCode,
      amount: bookings.damageCharge,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "completed"),
        gte(bookings.completedAt, range.from),
        lte(bookings.completedAt, range.to),
      ),
    );

  const bucketMap = new Map<string, DailyRevenueBucket>();

  const key = (day: string, currency: string) => `${day}|${currency}`;

  for (const row of rentalRows) {
    const day = String(row.day);
    const currency = String(row.currency).trim();
    const k = key(day, currency);
    const existing = bucketMap.get(k) ?? {
      day,
      currency,
      rental: "0.00",
      damage: "0.00",
    };
    existing.rental = (
      parseFloat(existing.rental) + parseFloat(String(row.amount))
    ).toFixed(2);
    bucketMap.set(k, existing);
  }

  for (const row of damageRows) {
    const day = String(row.day);
    const currency = String(row.currency).trim();
    const k = key(day, currency);
    const existing = bucketMap.get(k) ?? {
      day,
      currency,
      rental: "0.00",
      damage: "0.00",
    };
    existing.damage = (
      parseFloat(existing.damage) + parseFloat(String(row.amount))
    ).toFixed(2);
    bucketMap.set(k, existing);
  }

  return [...bucketMap.values()].sort((a, b) =>
    a.day === b.day
      ? a.currency.localeCompare(b.currency)
      : a.day.localeCompare(b.day),
  );
}

// ─── Revenue breakdown by branch ──────────────────────────────────────────────

async function getRevenueBreakdownByBranch(
  range: DateRange,
): Promise<RevenueBreakdownRow[]> {
  const rentalRows = await db
    .select({
      bookingId: payments.bookingId,
      pickupBranchId: bookings.pickupBranchId,
      currency: payments.currencyCode,
      amount: payments.amount,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(
      and(
        eq(payments.paymentType, "rental"),
        eq(payments.status, "paid"),
        gte(payments.paidAt, range.from),
        lte(payments.paidAt, range.to),
      ),
    );

  const damageRows = await db
    .select({
      bookingId: bookings.id,
      pickupBranchId: bookings.pickupBranchId,
      currency: bookings.currencyCode,
      amount: bookings.damageCharge,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "completed"),
        gte(bookings.completedAt, range.from),
        lte(bookings.completedAt, range.to),
      ),
    );

  const branchMeta = await db
    .select({
      branchId: branches.id,
      branchName: branches.name,
      countryName: countries.name,
    })
    .from(branches)
    .innerJoin(countries, eq(branches.countryId, countries.id));

  const metaByBranch = new Map(
    branchMeta.map((b) => [
      Number(b.branchId),
      { branch: b.branchName, country: b.countryName },
    ]),
  );

  type Agg = {
    branchId: number;
    currency: string;
    bookingIds: Set<number>;
    revenue: number;
  };
  const aggMap = new Map<string, Agg>();

  const aggKey = (branchId: number, currency: string) =>
    `${branchId}|${currency}`;

  const touch = (
    branchId: number,
    currency: string,
    bookingId: number,
    amount: number,
  ) => {
    const k = aggKey(branchId, currency);
    let row = aggMap.get(k);
    if (!row) {
      row = {
        branchId,
        currency,
        bookingIds: new Set(),
        revenue: 0,
      };
      aggMap.set(k, row);
    }
    row.bookingIds.add(bookingId);
    row.revenue += amount;
  };

  for (const r of rentalRows) {
    touch(
      Number(r.pickupBranchId),
      String(r.currency).trim(),
      Number(r.bookingId),
      parseFloat(String(r.amount)) || 0,
    );
  }

  for (const r of damageRows) {
    touch(
      Number(r.pickupBranchId),
      String(r.currency).trim(),
      Number(r.bookingId),
      parseFloat(String(r.amount)) || 0,
    );
  }

  return [...aggMap.values()]
    .map((row) => {
      const meta = metaByBranch.get(row.branchId);
      return {
        branchId: row.branchId,
        country: meta?.country ?? "Unknown",
        branch: meta?.branch ?? `Branch #${row.branchId}`,
        currency: row.currency,
        bookings: row.bookingIds.size,
        revenue: row.revenue.toFixed(2),
      };
    })
    .sort((a, b) => {
      const c = a.country.localeCompare(b.country);
      if (c !== 0) return c;
      return a.branch.localeCompare(b.branch);
    });
}

// ─── Recent bookings ──────────────────────────────────────────────────────────

async function getRecentBookings(limit = 10): Promise<RecentBookingRow[]> {
  const rows = await db
    .select({
      id: bookings.id,
      reference: bookings.reference,
      status: bookings.status,
      firstName: users.firstName,
      lastName: users.lastName,
      carMake: cars.make,
      carModel: cars.model,
      branchName: branches.name,
      totalAmount: bookings.totalAmount,
      currencyCode: bookings.currencyCode,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .innerJoin(cars, eq(bookings.carId, cars.id))
    .innerJoin(branches, eq(bookings.pickupBranchId, branches.id))
    .orderBy(desc(bookings.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: Number(r.id),
    reference: r.reference,
    status: r.status,
    customerName: `${r.firstName} ${r.lastName}`.trim() || "—",
    carLabel: `${r.carMake} ${r.carModel}`.trim(),
    pickupBranchName: r.branchName,
    totalAmount: r.totalAmount != null ? String(r.totalAmount) : null,
    currencyCode: String(r.currencyCode).trim(),
    createdAt: r.createdAt,
  }));
}

// ─── Fleet by branch ──────────────────────────────────────────────────────────

async function getFleetByBranch(): Promise<FleetByBranchRow[]> {
  const fleetRows = await db
    .select({
      branchId: cars.currentBranchId,
      total: count(),
      available: sql<number>`count(*) filter (where ${cars.status} = 'available')`,
      maintenance: sql<number>`count(*) filter (where ${cars.status} = 'maintenance')`,
    })
    .from(cars)
    .where(isNull(cars.deletedAt))
    .groupBy(cars.currentBranchId);

  const bookedRows = await db
    .select({
      branchId: cars.currentBranchId,
      booked: sql<number>`count(distinct ${cars.id})`,
    })
    .from(cars)
    .innerJoin(
      bookings,
      and(
        eq(bookings.carId, cars.id),
        inArray(bookings.status, [...FLEET_BOOKED_STATUSES]),
      ),
    )
    .where(isNull(cars.deletedAt))
    .groupBy(cars.currentBranchId);

  const bookedByBranch = new Map(
    bookedRows.map((r) => [Number(r.branchId), Number(r.booked)]),
  );

  const branchNames = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches);

  const nameById = new Map(branchNames.map((b) => [Number(b.id), b.name]));

  return fleetRows
    .map((row) => {
      const branchId = Number(row.branchId);
      return {
        branchId,
        branchName: nameById.get(branchId) ?? `Branch #${branchId}`,
        total: Number(row.total),
        available: Number(row.available),
        booked: bookedByBranch.get(branchId) ?? 0,
        maintenance: Number(row.maintenance),
      };
    })
    .sort((a, b) => a.branchName.localeCompare(b.branchName));
}

export const reportRepository = {
  getStatCounts,
  getRevenueByCurrency,
  getRevenueDailyBuckets,
  getRevenueBreakdownByBranch,
  getRecentBookings,
  getFleetByBranch,
};
