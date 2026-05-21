/**
 * Pure helpers for branch handover queue eligibility and one-way rules.
 * Mirror repository filters in handover.repository.ts — used in tests and docs.
 */

export function isOneWayRental(pickupBranchId: number, dropoffBranchId: number): boolean {
  return pickupBranchId !== dropoffBranchId
}

/** Staff may open booking detail if assigned to pickup or dropoff branch. */
export function canStaffViewBooking(
  pickupBranchId: number,
  dropoffBranchId: number,
  staffBranchId: number,
): boolean {
  return pickupBranchId === staffBranchId || dropoffBranchId === staffBranchId
}

/** Pick-up queue: confirmed at pickup branch, no pickup handover yet. */
export function isEligibleForPickupQueue(params: {
  status: string
  pickupBranchId: number
  staffBranchId: number
  hasPickupHandover: boolean
}): boolean {
  return (
    params.status === "confirmed" &&
    params.pickupBranchId === params.staffBranchId &&
    !params.hasPickupHandover
  )
}

/** Return queue: active at dropoff branch, pickup done, return not done. */
export function isEligibleForReturnQueue(params: {
  status: string
  dropoffBranchId: number
  staffBranchId: number
  hasPickupHandover: boolean
  hasReturnHandover: boolean
}): boolean {
  return (
    params.status === "active" &&
    params.dropoffBranchId === params.staffBranchId &&
    params.hasPickupHandover &&
    !params.hasReturnHandover
  )
}
