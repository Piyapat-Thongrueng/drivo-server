import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import { DASHBOARD_DEFAULT_PERIOD_DAYS, DASHBOARD_TIMEZONE } from "../config/dashboard.constants"

dayjs.extend(utc)
dayjs.extend(timezone)

/** ช่วงเวลาแบบ ISO สำหรับ query timestamptz */
export interface DateRange {
  from: string
  to: string
}

/** วันใน TZ (YYYY-MM-DD) สำหรับ chart labels */
export function formatDayKey(iso: string, tz: string = DASHBOARD_TIMEZONE): string {
  return dayjs(iso).tz(tz).format("YYYY-MM-DD")
}

/** ช่วง "วันนี้" ใน timezone ที่กำหนด */
export function getTodayRange(
  tz: string = DASHBOARD_TIMEZONE,
  now: dayjs.Dayjs = dayjs(),
): DateRange {
  const d = now.tz(tz)
  return {
    from: d.startOf("day").toISOString(),
    to: d.endOf("day").toISOString(),
  }
}

/** ช่วง "เมื่อวาน" ใน timezone ที่กำหนด */
export function getYesterdayRange(
  tz: string = DASHBOARD_TIMEZONE,
  now: dayjs.Dayjs = dayjs(),
): DateRange {
  const d = now.tz(tz).subtract(1, "day")
  return {
    from: d.startOf("day").toISOString(),
    to: d.endOf("day").toISOString(),
  }
}

/** ช่วง N วันล่าสุด รวมวันนี้ (period=7 → 7 วัน) */
export function resolvePeriodRange(
  periodDays: number = DASHBOARD_DEFAULT_PERIOD_DAYS,
  tz: string = DASHBOARD_TIMEZONE,
  now: dayjs.Dayjs = dayjs(),
): DateRange {
  const end = now.tz(tz).endOf("day")
  const start = end.subtract(periodDays - 1, "day").startOf("day")
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  }
}

/** ช่วงจากวันที่ YYYY-MM-DD (inclusive ทั้งสองวัน) */
export function resolveCustomRange(
  fromDate: string,
  toDate: string,
  tz: string = DASHBOARD_TIMEZONE,
): DateRange {
  const start = dayjs.tz(fromDate, tz).startOf("day")
  const end = dayjs.tz(toDate, tz).endOf("day")
  if (end.isBefore(start)) {
    throw new Error("Invalid date range: `to` must be on or after `from`")
  }
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  }
}

export interface DashboardRangeInput {
  period?: 7 | 30 | "7" | "30"
  from?: string
  to?: string
}

/** แปลง query dashboard → DateRange (custom ชนะ period) */
export function resolveDashboardRange(
  input: DashboardRangeInput,
  tz: string = DASHBOARD_TIMEZONE,
  now: dayjs.Dayjs = dayjs(),
): DateRange {
  if (input.from && input.to) {
    return resolveCustomRange(input.from, input.to, tz)
  }
  const periodNum =
    input.period === 7 || input.period === "7" ? 7 : DASHBOARD_DEFAULT_PERIOD_DAYS
  return resolvePeriodRange(periodNum, tz, now)
}

/** แปลง DateRange เป็นป้ายวันที่ YYYY-MM-DD สำหรับ API response */
export function toRangeLabels(
  range: DateRange,
  tz: string = DASHBOARD_TIMEZONE,
): { from: string; to: string } {
  return {
    from: dayjs(range.from).tz(tz).format("YYYY-MM-DD"),
    to: dayjs(range.to).tz(tz).format("YYYY-MM-DD"),
  }
}

/** รายการวัน YYYY-MM-DD ทุกวันในช่วง (ใช้เติม chart buckets) */
export function listDaysInRange(
  range: DateRange,
  tz: string = DASHBOARD_TIMEZONE,
): string[] {
  const days: string[] = []
  let cur = dayjs(range.from).tz(tz).startOf("day")
  const end = dayjs(range.to).tz(tz).startOf("day")

  while (cur.isBefore(end) || cur.isSame(end, "day")) {
    days.push(cur.format("YYYY-MM-DD"))
    cur = cur.add(1, "day")
  }
  return days
}
