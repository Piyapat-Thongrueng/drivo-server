/** Timezone สำหรับ "today" / stat cards บน dashboard */
export const DASHBOARD_TIMEZONE = "Asia/Bangkok"

/** Default ช่วงรายได้เมื่อไม่ระบุ period */
export const DASHBOARD_DEFAULT_PERIOD_DAYS = 30

/** สถานะ booking ที่ถือว่ารถถูกจองอยู่ (fleet "booked") */
export const FLEET_BOOKED_STATUSES = [
  "approved",
  "pending_payment",
  "confirmed",
  "active",
] as const
