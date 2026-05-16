import cron from "node-cron"
import { bookingRepository } from "../repositories/booking.repository"

/**
 * ทุก 1 นาที — cancel booking ที่ pending_payment และ payment_deadline เลยแล้ว
 *
 * ลูกค้ามีเวลา 15 นาทีหลัง admin approve เพื่อชำระเงิน
 * ถ้าไม่ชำระในเวลา → ระบบยกเลิกอัตโนมัติ
 */
export function startBookingCronJobs() {
  cron.schedule("* * * * *", async () => {
    try {
      const cancelled = await bookingRepository.cancelExpiredBookings()
      if (cancelled.length > 0) {
        console.log(
          `[booking.job] Auto-cancelled ${cancelled.length} expired booking(s):`,
          cancelled.map((b) => b.reference).join(", "),
        )
      }
    } catch (err) {
      console.error("[booking.job] Failed to cancel expired bookings:", err)
    }
  })

  console.log("[booking.job] Booking cron jobs started")
}
