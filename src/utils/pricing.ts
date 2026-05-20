import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

/** Return time is strictly after 14:00 on that calendar day (14:00:00 does not count). */
function isReturnAfter14(dropoff: dayjs.Dayjs): boolean {
  const cutoff = dropoff.startOf("day").hour(14).minute(0).second(0).millisecond(0)
  return dropoff.isAfter(cutoff)
}

export interface PricingBreakdown {
  days: number
  hours: number
  baseAmount: number
  addonAmount: number
  oneWayFee: number
  totalAmount: number
  depositAmount: number
}

/**
 * Calculate the number of billable days and hours for a rental period,
 * using the branch's local timezone for all time comparisons.
 *
 * Rules (reviewer spec, branch timezone):
 *  1. Return strictly after 14:00 → that period counts as 1 full day (e.g. 10:00–15:00)
 *  2. Usage strictly over 8 hours (same day) → 1 full day
 *  3. Multi-day: remaining hours reset from pickup clock-time each day (not midnight)
 */
export function calculateDaysAndHours(
  pickupISO: string,
  dropoffISO: string,
  branchTimezone: string,
): { days: number; hours: number } {
  const pickup = dayjs(pickupISO).tz(branchTimezone)
  const dropoff = dayjs(dropoffISO).tz(branchTimezone)

  const totalMinutes = dropoff.diff(pickup, "minute")

  // Determine how many full calendar days separate the two dates
  const pickupDay = pickup.startOf("day")
  const dropoffDay = dropoff.startOf("day")
  const calendarDaySpan = dropoffDay.diff(pickupDay, "day")

  if (calendarDaySpan === 0) {
    // Same calendar day

    // Rule 1: return after 14:00 → 1 full day (14:00 sharp does not trigger)
    if (isReturnAfter14(dropoff)) {
      return { days: 1, hours: 0 }
    }

    // Rule 2: over 8 hours → 1 full day
    if (totalMinutes > 8 * 60) {
      return { days: 1, hours: 0 }
    }

    // Exact hours (round down)
    return { days: 0, hours: Math.floor(totalMinutes / 60) }
  }

  // Multi-day (calendarDaySpan >= 1)
  // Rule 1: final-day return after 14:00 → add one full day for that period
  if (isReturnAfter14(dropoff)) {
    return { days: calendarDaySpan + 1, hours: 0 }
  }

  // Rule 3: remaining hours reset from pickup time on the final day.
  // "Pickup time on the final day" = pickup time shifted forward by calendarDaySpan days.
  const pickupTimeOnFinalDay = pickup.add(calendarDaySpan, "day")
  const remainingMinutes = dropoff.diff(pickupTimeOnFinalDay, "minute")

  // Remaining time that doesn't reach a full day
  const remainingHours = Math.max(0, Math.floor(remainingMinutes / 60))

  // Rule 2 on the remaining segment: if the remaining window itself > 8h → add a day
  if (remainingMinutes > 8 * 60) {
    return { days: calendarDaySpan + 1, hours: 0 }
  }

  return { days: calendarDaySpan, hours: remainingHours }
}

/**
 * Calculate the full pricing breakdown for a booking.
 *
 * @param pickupISO    - Pickup datetime as ISO string (with timezone offset)
 * @param dropoffISO   - Dropoff datetime as ISO string (with timezone offset)
 * @param branchTimezone - IANA timezone string of the pickup branch (e.g. "Asia/Bangkok")
 * @param dailyRate    - Car daily rate in currency units
 * @param hourlyRate   - Car hourly rate in currency units
 * @param addonAmount  - Total addon cost already summed externally (pass 0 if none)
 * @param oneWayFee    - One-way surcharge (pass 0 for same-branch)
 * @param depositAmount - Fixed deposit amount (not calculated from pricing rules)
 */
export function calculatePricing(
  pickupISO: string,
  dropoffISO: string,
  branchTimezone: string,
  dailyRate: number,
  hourlyRate: number,
  addonAmount: number,
  oneWayFee: number,
  depositAmount: number,
): PricingBreakdown {
  const { days, hours } = calculateDaysAndHours(
    pickupISO,
    dropoffISO,
    branchTimezone,
  )

  const baseAmount =
    Math.round((days * dailyRate + hours * hourlyRate) * 100) / 100
  const total =
    Math.round((baseAmount + addonAmount + oneWayFee) * 100) / 100

  return {
    days,
    hours,
    baseAmount,
    addonAmount,
    oneWayFee,
    totalAmount: total,
    depositAmount,
  }
}

/**
 * Sum addon prices for a list of (pricePerDay, numberOfDays) pairs.
 * Addons are charged per day; numberOfDays here follows the same
 * billing days as calculateDaysAndHours (not calendar days).
 * If billingDays === 0 (pure hourly), each addon is charged for 1 unit.
 */
export function calculateAddonAmount(
  addons: { pricePerDay: number }[],
  billingDays: number,
): number {
  const chargeableDays = billingDays > 0 ? billingDays : 1
  const total = addons.reduce(
    (sum, a) => sum + a.pricePerDay * chargeableDays,
    0,
  )
  return Math.round(total * 100) / 100
}
