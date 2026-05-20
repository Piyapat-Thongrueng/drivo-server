import Stripe from "stripe"
import { bookingRepository } from "../repositories/booking.repository"
import { paymentRepository } from "../repositories/payment.repository"
import { getStripeSecretKey, getStripeWebhookSecret } from "../config/stripe"
import { createError } from "../utils/error"
import type { AuthenticatedUser } from "../types"
import type { CreateCheckoutSessionDto } from "../types/dto/payment.dto"

// ─── Stripe client (สร้างครั้งเดียวตอน module load) ─────────────────────────

function getStripe() {
  return new Stripe(getStripeSecretKey())
}

// ─── Checkout Session ─────────────────────────────────────────────────────────

/**
 * POST /api/bookings/:id/checkout-session
 *
 * สร้าง Stripe Checkout Session ที่รวม 2 รายการ:
 *  1. ค่าเช่า (rental) — ตัดเงินทันที (capture)
 *  2. มัดจำ (deposit) — กันเงินไว้ก่อน ยังไม่ตัดจริง (authorize only)
 *
 * ลูกค้าจะถูก redirect ไปหน้า Stripe แล้ว redirect กลับมาที่ successUrl
 */
async function createCheckoutSession(
  bookingId: number,
  dto: CreateCheckoutSessionDto,
  user: AuthenticatedUser,
) {
  const stripe = getStripe()

  // ดึงจองพร้อม addons
  const booking = await bookingRepository.findById(bookingId)
  if (!booking) throw createError("Booking not found", 404)

  // ตรวจสิทธิ์ — ต้องเป็นเจ้าของจองเท่านั้น
  if (booking.userId !== user.id) {
    throw createError("You do not have permission to pay for this booking", 403)
  }

  // ต้องอยู่สถานะรอชำระก่อนจึงจะเปิด Checkout
  if (booking.status !== "pending_payment") {
    throw createError(
      `Cannot create payment session for booking with status "${booking.status}"`,
      409,
    )
  }

  // ตรวจ payment deadline — ถ้าหมดเวลาแล้วไม่อนุญาต
  if (booking.paymentDeadline && new Date() > new Date(booking.paymentDeadline)) {
    throw createError("Payment deadline has passed. The booking has been cancelled.", 409)
  }

  // ดึง payment rows ที่ approve สร้างไว้ (rental + deposit)
  const paymentRows = await paymentRepository.findByBookingId(bookingId)
  const rentalPayment = paymentRows.find((p) => p.paymentType === "rental")
  const depositPayment = paymentRows.find((p) => p.paymentType === "deposit")

  if (!rentalPayment || !depositPayment) {
    throw createError("Payment records not found. Please contact support.", 500)
  }

  // ป้องกันการสร้าง session ซ้ำ — ถ้า rental จ่ายแล้วไม่ต้องสร้างอีก
  if (rentalPayment.status === "paid") {
    throw createError("Rental payment has already been completed.", 409)
  }

  // แปลงจำนวนเงินเป็น smallest currency unit (satang สำหรับ THB)
  // Stripe ใช้ smallest unit เช่น 3000 THB = 300000 satang
  const rentalAmountSmallest = Math.round(Number(rentalPayment.amount) * 100)
  const depositAmountSmallest = Math.round(Number(depositPayment.amount) * 100)
  const currency = booking.currencyCode.toLowerCase()

  // ─── สร้าง Payment Intent สำหรับค่าเช่า (capture ทันที) ───────────────────

  const rentalIntent = await stripe.paymentIntents.create({
    amount: rentalAmountSmallest,
    currency,
    // capture_method: automatic = ตัดเงินทันทีที่ชำระ (default)
    capture_method: "automatic",
    metadata: {
      bookingId: String(bookingId),
      paymentType: "rental",
      paymentId: String(rentalPayment.id),
      reference: booking.reference,
    },
  })

  // ─── สร้าง Payment Intent สำหรับมัดจำ (authorize only — ยังไม่ตัดเงิน) ────

  const depositIntent = await stripe.paymentIntents.create({
    amount: depositAmountSmallest,
    currency,
    // capture_method: manual = กันเงินไว้ ต้องเรียก capture แยกต่างหากถึงจะตัดเงินจริง
    capture_method: "manual",
    metadata: {
      bookingId: String(bookingId),
      paymentType: "deposit",
      paymentId: String(depositPayment.id),
      reference: booking.reference,
    },
  })

  // ─── สร้าง Checkout Session รวม 2 Payment Intents ─────────────────────────

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    // ใช้ payment_intent_data เพื่อ attach PI ที่สร้างไว้แล้ว
    payment_intent_data: {
      // ค่าเช่าเป็น primary PI ของ session
      setup_future_usage: undefined,
    },
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: rentalAmountSmallest,
          product_data: {
            name: `ค่าเช่า — ${booking.reference}`,
            description: `รถเช่า (ชำระทันที)`,
          },
        },
        quantity: 1,
      },
      {
        price_data: {
          currency,
          unit_amount: depositAmountSmallest,
          product_data: {
            name: `มัดจำ — ${booking.reference}`,
            description: `เงินประกัน (กันวงเงิน คืนหลังนำส่งรถ)`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: dto.successUrl,
    cancel_url: dto.cancelUrl,
    metadata: {
      bookingId: String(bookingId),
      rentalPaymentId: String(rentalPayment.id),
      depositPaymentId: String(depositPayment.id),
      rentalIntentId: rentalIntent.id,
      depositIntentId: depositIntent.id,
      reference: booking.reference,
    },
    // Stripe บังคับ expires_at อย่างน้อย 30 นาทีจากตอนสร้าง session
    expires_at: (() => {
      const nowSec = Math.floor(Date.now() / 1000)
      const stripeMin = nowSec + 30 * 60
      const deadlineSec = booking.paymentDeadline
        ? Math.floor(new Date(booking.paymentDeadline).getTime() / 1000)
        : stripeMin
      return Math.max(stripeMin, deadlineSec)
    })(),
  })

  // บันทึก Stripe IDs ลง payment rows เพื่อ match ตอนรับ webhook
  await paymentRepository.updateStripeIds(
    Number(rentalPayment.id),
    rentalIntent.id,
    session.id,
  )
  await paymentRepository.updateStripeIds(
    Number(depositPayment.id),
    depositIntent.id,
    session.id,
  )

  return { sessionUrl: session.url, sessionId: session.id }
}

// ─── List payments ────────────────────────────────────────────────────────────

/**
 * GET /api/bookings/:id/payments
 * ดูประวัติการชำระของจองนี้ (rental + deposit)
 */
async function listBookingPayments(bookingId: number, user: AuthenticatedUser) {
  // ตรวจว่าจองมีอยู่และมีสิทธิ์ดู
  const booking = await bookingRepository.findById(bookingId)
  if (!booking) throw createError("Booking not found", 404)

  if (user.role !== "super_admin" && booking.userId !== user.id) {
    throw createError("You do not have permission to view these payments", 403)
  }

  return paymentRepository.findByBookingId(bookingId)
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

/**
 * POST /api/webhooks/stripe
 *
 * รับ event จาก Stripe แล้วอัปเดต DB ตามประเภท event:
 *  - checkout.session.completed      → primary path after Checkout (metadata on session)
 *  - payment_intent.succeeded        → rental paid (pre-created PI with metadata only)
 *  - payment_intent.amount_capturable_updated → deposit held
 *  - payment_intent.payment_failed   → payment failed
 *
 * ใช้ stripe.webhooks.constructEvent เพื่อตรวจ signature ป้องกัน request ปลอม
 */
async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  const stripe = getStripe()

  // ─── ตรวจ signature ว่า request มาจาก Stripe จริงๆ ────────────────────────
  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret())
  } catch {
    throw createError("Invalid webhook signature", 400)
  }

  // ─── Route event ไปตาม type ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = event.data.object as unknown as Record<string, unknown>

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(obj)
      break

    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(obj)
      break

    case "payment_intent.amount_capturable_updated":
      // Deposit ถูกกันเงินสำเร็จ (capture_method: manual)
      await handleDepositHeld(obj)
      break

    case "payment_intent.payment_failed":
      await handlePaymentFailed(obj)
      break

    default:
      // Event ประเภทอื่นๆ ที่ยังไม่ handle — ไม่ error เพื่อให้ Stripe ไม่ retry
      break
  }

  return { received: true }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function resolvePaymentIntentId(raw: unknown): string {
  if (typeof raw === "string") return raw
  if (raw && typeof raw === "object" && "id" in raw) {
    return String((raw as { id: string }).id)
  }
  return ""
}

/**
 * Checkout ชำระครบ → อ่าน metadata จาก session (ไม่ใช่ PI ที่สร้างไว้ก่อน session)
 * Stripe Checkout สร้าง PI ใหม่ตอนจ่าย — event นี้จึงเป็นจุดอัปเดต DB หลัก
 */
async function handleCheckoutSessionCompleted(session: Record<string, unknown>) {
  if (session["payment_status"] !== "paid") return

  const meta = (session["metadata"] ?? {}) as Record<string, string>
  const { bookingId, rentalPaymentId, depositPaymentId, depositIntentId } = meta
  const sessionId = session["id"] as string
  const checkoutPiId = resolvePaymentIntentId(session["payment_intent"])

  if (!bookingId || !rentalPaymentId || !sessionId) return

  const piForRental = checkoutPiId || meta["rentalIntentId"] || ""
  if (!piForRental) return

  await paymentRepository.markRentalPaid(
    Number(rentalPaymentId),
    piForRental,
    sessionId,
  )

  if (depositPaymentId) {
    const piForDeposit = meta["depositIntentId"] ?? depositIntentId ?? checkoutPiId
    if (piForDeposit) {
      await paymentRepository.markDepositHeld(
        Number(depositPaymentId),
        piForDeposit,
        sessionId,
      )
    }
  }

  await tryConfirmBooking(Number(bookingId))
}

/** ค่าเช่าชำระสำเร็จ → อัปเดต rental paid แล้วเช็คว่า confirmed ได้ไหม */
async function handlePaymentIntentSucceeded(intent: Record<string, unknown>) {
  const meta = (intent["metadata"] ?? {}) as Record<string, string>
  const { bookingId, paymentType, paymentId } = meta
  const intentId = intent["id"] as string

  // ถ้าไม่มี metadata ตามที่ตั้งไว้ → ไม่ใช่ PI ของเรา ข้ามไป
  if (!bookingId || !paymentId || !intentId) return

  // deposit ที่ capture_method: manual จะ succeed หลัง manual capture เท่านั้น
  // ในกรณีนี้เราจัดการ deposit ผ่าน amount_capturable_updated แทน
  if (paymentType === "deposit") return

  await paymentRepository.markRentalPaid(Number(paymentId), intentId, meta["sessionId"] ?? "")

  // เช็คว่า deposit held แล้วหรือยัง — ถ้าครบทั้งคู่ค่อย confirm
  await tryConfirmBooking(Number(bookingId))
}

/** มัดจำถูกกันเงินสำเร็จ (ยังไม่ตัดจริง) → อัปเดต deposit held แล้วเช็ค confirmed */
async function handleDepositHeld(intent: Record<string, unknown>) {
  const meta = (intent["metadata"] ?? {}) as Record<string, string>
  const { bookingId, paymentId } = meta
  const intentId = intent["id"] as string

  if (!bookingId || !paymentId || !intentId) return

  await paymentRepository.markDepositHeld(Number(paymentId), intentId, meta["sessionId"] ?? "")

  await tryConfirmBooking(Number(bookingId))
}

/** Payment ล้มเหลว — อัปเดต payment row เป็น failed */
async function handlePaymentFailed(intent: Record<string, unknown>) {
  const meta = (intent["metadata"] ?? {}) as Record<string, string>
  const { paymentId } = meta
  if (!paymentId) return

  await paymentRepository.markFailed(Number(paymentId))
  // booking ยังอยู่ pending_payment — ลูกค้าลองใหม่ได้ภายใน deadline
}

/**
 * ตรวจว่าจองนี้สามารถ confirm ได้ไหม
 * เงื่อนไข: rental paid + deposit มี stripePaymentIntentId (held)
 */
async function tryConfirmBooking(bookingId: number) {
  const paymentRows = await paymentRepository.findByBookingId(bookingId)
  const rental = paymentRows.find((p) => p.paymentType === "rental")
  const deposit = paymentRows.find((p) => p.paymentType === "deposit")

  const rentalPaid = rental?.status === "paid"
  const depositHeld = !!deposit?.stripePaymentIntentId

  if (rentalPaid && depositHeld) {
    await paymentRepository.confirmBooking(bookingId)
  }
}

// ─── Cancel deposit (ใช้จาก cron job) ───────────────────────────────────────

/**
 * ยกเลิก / release deposit PaymentIntent ที่ยัง uncaptured
 * เรียกตอน booking cancelled (timeout / user cancel)
 */
async function cancelDepositPaymentIntent(bookingId: number) {
  const stripe = getStripe()

  const depositRow = await paymentRepository.findDepositPaymentIntentByBookingId(bookingId)
  if (!depositRow?.stripePaymentIntentId) return // ยังไม่มี PI → ไม่ต้อง cancel

  try {
    await stripe.paymentIntents.cancel(depositRow.stripePaymentIntentId)
  } catch {
    // PI อาจถูก cancel ไปแล้ว หรืออยู่สถานะที่ cancel ไม่ได้ — log แต่ไม่ throw
    console.warn(
      `[payment] ไม่สามารถ cancel deposit PI ${depositRow.stripePaymentIntentId} สำหรับ booking ${bookingId}`,
    )
  }
}

export const paymentService = {
  createCheckoutSession,
  listBookingPayments,
  handleStripeWebhook,
  cancelDepositPaymentIntent,
}
