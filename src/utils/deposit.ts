import type { DepositStatus } from "../types/booking"
import { createError } from "./error"

/**
 * Resolve deposit amount from countries.default_deposit_amount.
 * Amount is in the country's currency_code unit (e.g. THB = baht).
 */
export function resolveCountryDepositAmount(
  defaultDepositAmount: string | number | null | undefined,
): number {
  const amount = Number(defaultDepositAmount ?? 0)

  if (Number.isFinite(amount) && amount > 0) {
    return amount
  }

  throw createError(
    "Deposit amount is not configured for this country. Please contact support.",
    409,
  )
}

export interface DepositSettlement {
  /** จำนวนเงินที่ลูกค้าได้รับคืน (Stripe refund / PI cancel) */
  refundAmount: number
  /** จำนวนเงินที่หักจากมัดจำ (0 ถ้า released) */
  forfeitAmount: number
  /** สถานะมัดจำใหม่ */
  depositStatus: DepositStatus
}

/**
 * คำนวณว่าจะคืนมัดจำเท่าไหร่หลังลูกค้าคืนรถ
 *
 * กฎ:
 *   extraCharge = 0          → คืนทั้งหมด  (released)
 *   0 < extra < deposit      → คืนบางส่วน  (partial)
 *   extra >= deposit         → ไม่คืนเลย   (forfeited)
 *
 * @param depositAmount  มัดจำที่ snapshot ไว้ตอนสร้างจอง (ต้อง > 0)
 * @param extraCharge    ค่าใช้จ่ายเพิ่มเติมจาก staff (>= 0, ไม่เกิน depositAmount)
 */
export function calculateDepositSettlement(
  depositAmount: number,
  extraCharge: number,
): DepositSettlement {
  if (depositAmount <= 0) {
    throw createError("Deposit amount must be positive", 400)
  }
  if (extraCharge < 0) {
    throw createError("Extra charge cannot be negative", 400)
  }
  if (extraCharge > depositAmount) {
    throw createError(
      `Extra charge (${extraCharge}) cannot exceed deposit amount (${depositAmount})`,
      400,
    )
  }

  if (extraCharge === 0) {
    return { refundAmount: depositAmount, forfeitAmount: 0, depositStatus: "released" }
  }

  if (extraCharge >= depositAmount) {
    return { refundAmount: 0, forfeitAmount: depositAmount, depositStatus: "forfeited" }
  }

  return {
    refundAmount: depositAmount - extraCharge,
    forfeitAmount: extraCharge,
    depositStatus: "partial",
  }
}
