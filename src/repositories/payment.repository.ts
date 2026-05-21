import { and, eq } from "drizzle-orm"
import { db } from "../db"
import { bookings, payments } from "../db/schema"

// ─── Read ─────────────────────────────────────────────────────────────────────

/** ดึง payment ทั้งหมดของจองหนึ่ง (rental + deposit) */
async function findByBookingId(bookingId: number) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, bookingId))
}

/** ดึง payment แถวเดียวด้วย Stripe Payment Intent ID (ใช้ตอนรับ webhook) */
async function findByStripePaymentIntentId(stripePaymentIntentId: string) {
  const result = await db
    .select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1)

  return result[0] ?? null
}

/** ดึง payment แถวเดียวด้วย Stripe Checkout Session ID */
async function findByStripeCheckoutSessionId(stripeCheckoutSessionId: string) {
  const result = await db
    .select()
    .from(payments)
    .where(eq(payments.stripeCheckoutSessionId, stripeCheckoutSessionId))
    .limit(1)

  return result[0] ?? null
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * อัปเดต payment ค่าเช่า (rental) เมื่อ Stripe แจ้งว่าชำระสำเร็จ
 * บันทึก stripe_payment_intent_id + session_id + status = paid
 */
async function markRentalPaid(
  paymentId: number,
  stripePaymentIntentId: string,
  stripeCheckoutSessionId: string,
) {
  const [updated] = await db
    .update(payments)
    .set({
      status: "paid",
      stripePaymentIntentId,
      stripeCheckoutSessionId,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(payments.id, BigInt(paymentId)))
    .returning()

  return updated
}

/**
 * อัปเดต payment มัดจำ (deposit) เมื่อ Stripe กัน (hold) เงินสำเร็จ
 * ยังไม่ตัดเงินจริง — บันทึก stripe_payment_intent_id เพื่อ release ทีหลัง
 */
async function markDepositHeld(
  paymentId: number,
  stripePaymentIntentId: string,
  stripeCheckoutSessionId: string,
) {
  const [updated] = await db
    .update(payments)
    .set({
      // status ยังเป็น pending เพราะยังไม่ตัดเงินจริง
      stripePaymentIntentId,
      stripeCheckoutSessionId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(payments.id, BigInt(paymentId)))
    .returning()

  return updated
}

/** อัปเดต payment ว่า failed (เช่น บัตรปฏิเสธ) */
async function markFailed(paymentId: number) {
  const [updated] = await db
    .update(payments)
    .set({
      status: "failed",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(payments.id, BigInt(paymentId)))
    .returning()

  return updated
}

/**
 * อัปเดตสถานะ booking เป็น confirmed
 * เรียกหลังจาก rental paid + deposit held ครบทั้งคู่
 */
async function confirmBooking(bookingId: number) {
  const [updated] = await db
    .update(bookings)
    .set({
      status: "confirmed",
      depositStatus: "held",
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(bookings.id, BigInt(bookingId)))
    .returning()

  return updated
}

/**
 * อัปเดต Stripe Payment Intent ID บน payment แถว deposit
 * ใช้ตอนสร้าง Checkout Session เพื่อเก็บ PI ID ไว้ cancel/release ทีหลัง
 */
async function updateStripeIds(
  paymentId: number,
  stripePaymentIntentId: string,
  stripeCheckoutSessionId: string,
) {
  const [updated] = await db
    .update(payments)
    .set({
      stripePaymentIntentId,
      stripeCheckoutSessionId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(payments.id, BigInt(paymentId)))
    .returning()

  return updated
}

/**
 * ดึง stripe_payment_intent_id ของ deposit สำหรับ booking นี้
 * ใช้ตอน cron cancel เพื่อ release hold ที่ Stripe
 */
async function findDepositPaymentIntentByBookingId(bookingId: number) {
  const result = await db
    .select({
      id: payments.id,
      stripePaymentIntentId: payments.stripePaymentIntentId,
    })
    .from(payments)
    .where(
      and(
        eq(payments.bookingId, bookingId),
        eq(payments.paymentType, "deposit"),
      ),
    )
    .limit(1)

  return result[0] ?? null
}

export const paymentRepository = {
  findByBookingId,
  findByStripePaymentIntentId,
  findByStripeCheckoutSessionId,
  markRentalPaid,
  markDepositHeld,
  markFailed,
  confirmBooking,
  updateStripeIds,
  findDepositPaymentIntentByBookingId,
}
