import { handoverRepository } from "../repositories/handover.repository"
import { paymentService } from "./payment.service"
import { createError } from "../utils/error"
import type { AuthenticatedUser } from "../types"
import type { PickupHandoverDto, ReturnHandoverDto } from "../types/dto/handover.dto"

// ─── Queue helpers ─────────────────────────────────────────────────────────────

function requireBranchId(user: AuthenticatedUser): number {
  if (user.branchId == null) {
    throw createError("Your account is not assigned to a branch", 403)
  }
  return user.branchId
}

/** GET /api/branch/me */
async function getBranchInfo(user: AuthenticatedUser) {
  const branchId = requireBranchId(user)
  const branch = await handoverRepository.findBranchById(branchId)
  if (!branch) throw createError("Branch not found", 404)
  return { branchId, branchName: branch.name }
}

/** GET /api/branch/queues/pickup */
async function getPickupQueue(user: AuthenticatedUser, search?: string) {
  const branchId = requireBranchId(user)
  return handoverRepository.findPickupQueue(branchId, search)
}

/** GET /api/branch/queues/return */
async function getReturnQueue(user: AuthenticatedUser, search?: string) {
  const branchId = requireBranchId(user)
  return handoverRepository.findReturnQueue(branchId, search)
}

/** GET /api/branch/bookings/:id */
async function getBookingDetail(bookingId: number, user: AuthenticatedUser) {
  const branchId = requireBranchId(user)
  const detail = await handoverRepository.findBookingDetailForHandover(bookingId)
  if (!detail) throw createError("Booking not found", 404)

  // staff ต้องเป็นสาขา pickup หรือ dropoff เท่านั้น
  const isPickupStaff = detail.pickupBranchId === branchId
  const isDropoffStaff = detail.dropoffBranchId === branchId
  if (!isPickupStaff && !isDropoffStaff) {
    throw createError("You do not have access to this booking", 403)
  }

  return detail
}

// ─── Pickup ────────────────────────────────────────────────────────────────────

/**
 * POST /api/branch/bookings/:id/pickup
 *
 * กฎ:
 * 1. Booking ต้องอยู่สถานะ confirmed
 * 2. pickup_branch_id ต้องตรงกับสาขาของ staff
 * 3. ยังไม่มี pickup handover (DB unique constraint จะป้องกันด้วย)
 */
async function submitPickup(
  bookingId: number,
  dto: PickupHandoverDto,
  user: AuthenticatedUser,
) {
  const branchId = requireBranchId(user)
  const detail = await handoverRepository.findBookingDetailForHandover(bookingId)

  if (!detail) throw createError("Booking not found", 404)
  if (detail.status !== "confirmed") {
    throw createError(
      `Cannot pick up: booking status is "${detail.status}" (expected "confirmed")`,
      409,
    )
  }
  if (detail.pickupBranchId !== branchId) {
    throw createError(
      "This booking is not scheduled for pickup at your branch",
      403,
    )
  }

  // ตรวจว่ายังไม่มี pickup handover
  const existingPickup = detail.handovers.find((hv) => hv.type === "pickup")
  if (existingPickup) {
    throw createError("Pickup handover already exists for this booking", 409)
  }

  const result = await handoverRepository.insertPickup({
    bookingId,
    branchId,
    handledBy: user.id,
    fuelLevel: dto.fuelLevel,
    extraCharge: 0,
    photos: dto.photos,
  })

  return result
}

// ─── Return ────────────────────────────────────────────────────────────────────

/**
 * POST /api/branch/bookings/:id/return
 *
 * กฎ:
 * 1. Booking ต้องอยู่สถานะ active
 * 2. dropoff_branch_id ต้องตรงกับสาขาของ staff
 * 3. ต้องมี pickup handover แล้ว
 * 4. ยังไม่มี return handover
 * 5. extraCharge ต้องไม่เกิน depositAmount
 *
 * ลำดับ:
 * A. Stripe settle deposit (ก่อน DB commit)
 * B. DB transaction: insert handover + photos + update booking + update car
 */
async function submitReturn(
  bookingId: number,
  dto: ReturnHandoverDto,
  user: AuthenticatedUser,
) {
  const branchId = requireBranchId(user)
  const detail = await handoverRepository.findBookingDetailForHandover(bookingId)

  if (!detail) throw createError("Booking not found", 404)
  if (detail.status !== "active") {
    throw createError(
      `Cannot return: booking status is "${detail.status}" (expected "active")`,
      409,
    )
  }
  if (detail.dropoffBranchId !== branchId) {
    throw createError(
      "This booking is not scheduled for return at your branch",
      403,
    )
  }

  const existingPickup = detail.handovers.find((hv) => hv.type === "pickup")
  if (!existingPickup) {
    throw createError("Pickup handover not found — cannot return before pickup", 409)
  }

  const existingReturn = detail.handovers.find((hv) => hv.type === "return")
  if (existingReturn) {
    throw createError("Return handover already exists for this booking", 409)
  }

  const depositAmount = Number(detail.depositAmount)
  if (dto.extraCharge > depositAmount) {
    throw createError(
      `Extra charge (${dto.extraCharge}) cannot exceed deposit amount (${depositAmount})`,
      400,
    )
  }

  // ─── A. Stripe settle deposit ─────────────────────────────────────────────

  const settlement = await paymentService.settleDepositOnReturn(
    bookingId,
    dto.extraCharge,
    depositAmount,
  )

  // ─── B. DB transaction ────────────────────────────────────────────────────

  const result = await handoverRepository.insertReturn({
    bookingId,
    branchId,
    handledBy: user.id,
    fuelLevel: dto.fuelLevel,
    extraCharge: dto.extraCharge,
    photos: dto.photos,
    depositAmount,
    forfeitAmount: settlement.forfeitAmount,
    depositStatusValue: settlement.depositStatus as "released" | "partial" | "forfeited",
    dropoffBranchId: detail.dropoffBranchId,
    carId: detail.carId,
  })

  return {
    ...result,
    settlement,
  }
}

export const handoverService = {
  getBranchInfo,
  getPickupQueue,
  getReturnQueue,
  getBookingDetail,
  submitPickup,
  submitReturn,
}
