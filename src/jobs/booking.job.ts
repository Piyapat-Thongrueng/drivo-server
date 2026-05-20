import cron from "node-cron"
import { bookingRepository } from "../repositories/booking.repository"
import { paymentService } from "../services/payment.service"

/**
 * ทุก 1 นาที — cancel booking ที่ pending_payment และ payment_deadline เลยแล้ว
 *
 * ลูกค้ามีเวลา 15 นาทีหลัง admin approve เพื่อชำระเงิน
 * ถ้าไม่ชำระในเวลา → ระบบยกเลิกอัตโนมัติ + release deposit hold ที่ Stripe (ถ้ามี)
 */
export function startBookingCronJobs() {
  cron.schedule("* * * * *", async () => {
    try {
      // ดึง booking ที่ expired ก่อน cancel เพื่อนำ ID ไป release deposit
      const cancelled = await bookingRepository.cancelExpiredBookings()

      if (cancelled.length > 0) {
        console.log(
          `[booking.job] Auto-cancelled ${cancelled.length} expired booking(s):`,
          cancelled.map((b) => b.reference).join(", "),
        )

        // Release deposit PaymentIntent ที่ยัง hold อยู่ที่ Stripe
        // ทำแบบ parallel เพื่อความเร็ว แต่ไม่ throw ถ้า PI ใดใดล้มเหลว
        await Promise.allSettled(
          cancelled.map((booking) =>
            paymentService.cancelDepositPaymentIntent(Number(booking.id)),
          ),
        )
      }
    } catch (err) {
      console.error("[booking.job] Failed to cancel expired bookings:", err)
    }
  })

  console.log("[booking.job] Booking cron jobs started")
}
