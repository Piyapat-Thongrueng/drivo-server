import { and, eq, inArray } from "drizzle-orm"
import { db } from "../db"
import { branches, carAddons, cars, countries, oneWayFees } from "../db/schema"
import { resolveCountryDepositAmount } from "../utils/deposit"
import {
  calculateAddonAmount,
  calculateDaysAndHours,
  calculatePricing,
} from "../utils/pricing"
import { createError } from "../utils/error"
import type { PricingPreviewDto } from "../types/dto/pricing.dto"

/**
 * Fetch the full pricing preview for a booking request.
 * Used by POST /api/pricing/preview before the booking is created.
 */
async function previewPricing(dto: PricingPreviewDto) {
  // 1. Validate dates
  if (dto.dropoffDatetime <= dto.pickupDatetime) {
    throw createError("Drop-off must be after pick-up", 400)
  }

  // 2. Fetch car
  const carResult = await db
    .select({
      id: cars.id,
      hourlyRate: cars.hourlyRate,
      dailyRate: cars.dailyRate,
      currentBranchId: cars.currentBranchId,
      status: cars.status,
    })
    .from(cars)
    .where(eq(cars.id, BigInt(dto.carId)))
    .limit(1)

  const car = carResult[0]
  if (!car) throw createError("Car not found", 404)
  if (car.status !== "available") throw createError("Car is not available", 409)

  // 3. Fetch pickup branch with country timezone
  const branchResult = await db
    .select({
      branchId: branches.id,
      countryId: branches.countryId,
      timezone: countries.timezone,
      currencyCode: countries.currencyCode,
      defaultDepositAmount: countries.defaultDepositAmount,
    })
    .from(branches)
    .innerJoin(countries, eq(branches.countryId, countries.id))
    .where(eq(branches.id, BigInt(dto.pickupBranchId)))
    .limit(1)

  const branch = branchResult[0]
  if (!branch) throw createError("Pickup branch not found", 404)

  const depositAmount = resolveCountryDepositAmount(branch.defaultDepositAmount)

  // 4. Fetch addons (only available, belonging to this car)
  const addonRows =
    dto.addonIds.length > 0
      ? await db
          .select({ id: carAddons.id, pricePerDay: carAddons.pricePerDay })
          .from(carAddons)
          .where(
            and(
              eq(carAddons.carId, dto.carId),
              inArray(
                carAddons.id,
                dto.addonIds.map((id) => BigInt(id)),
              ),
              eq(carAddons.isAvailable, true),
            ),
          )
      : []

  // 5. Fetch one-way fee if applicable
  let oneWayFee = 0
  if (dto.pickupBranchId !== dto.dropoffBranchId) {
    const feeResult = await db
      .select({ fee: oneWayFees.fee })
      .from(oneWayFees)
      .where(
        and(
          eq(oneWayFees.fromBranchId, dto.pickupBranchId),
          eq(oneWayFees.toBranchId, dto.dropoffBranchId),
        ),
      )
      .limit(1)

    if (feeResult[0]) {
      oneWayFee = Number(feeResult[0].fee)
    }
  }

  // 6. Calculate billing units
  const { days, hours } = calculateDaysAndHours(
    dto.pickupDatetime,
    dto.dropoffDatetime,
    branch.timezone,
  )

  // 7. Calculate addon total (charged per billing day, min 1 for hourly)
  const addonAmount = calculateAddonAmount(
    addonRows.map((a) => ({ pricePerDay: Number(a.pricePerDay) })),
    days,
  )

  // 8. Full pricing breakdown
  const breakdown = calculatePricing(
    dto.pickupDatetime,
    dto.dropoffDatetime,
    branch.timezone,
    Number(car.dailyRate),
    Number(car.hourlyRate),
    addonAmount,
    oneWayFee,
    depositAmount,
  )

  return {
    ...breakdown,
    currencyCode: branch.currencyCode,
    timezone: branch.timezone,
    addons: addonRows.map((a) => ({
      id: Number(a.id),
      pricePerDay: Number(a.pricePerDay),
    })),
  }
}

export const pricingService = { previewPricing }
