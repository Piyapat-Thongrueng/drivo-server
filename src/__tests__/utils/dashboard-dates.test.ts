import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import {
  formatDayKey,
  getTodayRange,
  getYesterdayRange,
  listDaysInRange,
  resolveCustomRange,
  resolveDashboardRange,
  resolvePeriodRange,
  toRangeLabels,
} from "../../utils/dashboard-dates"

dayjs.extend(utc)
dayjs.extend(timezone)

const TZ = "Asia/Bangkok"
/** 2026-05-21 10:00 ใน Bangkok */
const FIXED_NOW = dayjs.tz("2026-05-21T10:00:00", TZ)

describe("dashboard-dates", () => {
  describe("getTodayRange", () => {
    it("returns start and end of today in Bangkok", () => {
      const range = getTodayRange(TZ, FIXED_NOW)
      expect(formatDayKey(range.from, TZ)).toBe("2026-05-21")
      expect(formatDayKey(range.to, TZ)).toBe("2026-05-21")
    })
  })

  describe("getYesterdayRange", () => {
    it("returns previous calendar day in Bangkok", () => {
      const range = getYesterdayRange(TZ, FIXED_NOW)
      expect(formatDayKey(range.from, TZ)).toBe("2026-05-20")
      expect(formatDayKey(range.to, TZ)).toBe("2026-05-20")
    })
  })

  describe("resolvePeriodRange", () => {
    it("spans 7 days including today", () => {
      const range = resolvePeriodRange(7, TZ, FIXED_NOW)
      const days = listDaysInRange(range, TZ)
      expect(days).toHaveLength(7)
      expect(days[0]).toBe("2026-05-15")
      expect(days[6]).toBe("2026-05-21")
    })

    it("spans 30 days including today", () => {
      const range = resolvePeriodRange(30, TZ, FIXED_NOW)
      const days = listDaysInRange(range, TZ)
      expect(days).toHaveLength(30)
    })
  })

  describe("resolveCustomRange", () => {
    it("accepts inclusive from/to dates", () => {
      const range = resolveCustomRange("2026-05-01", "2026-05-03", TZ)
      const days = listDaysInRange(range, TZ)
      expect(days).toEqual(["2026-05-01", "2026-05-02", "2026-05-03"])
    })

    it("throws when to is before from", () => {
      expect(() =>
        resolveCustomRange("2026-05-10", "2026-05-01", TZ),
      ).toThrow("Invalid date range")
    })
  })

  describe("listDaysInRange", () => {
    it("returns one day for same-day range", () => {
      const range = getTodayRange(TZ, FIXED_NOW)
      expect(listDaysInRange(range, TZ)).toEqual(["2026-05-21"])
    })
  })

  describe("resolveDashboardRange", () => {
    it("prefers custom from/to over period", () => {
      const range = resolveDashboardRange(
        { period: 7, from: "2026-05-01", to: "2026-05-03" },
        TZ,
        FIXED_NOW,
      )
      expect(toRangeLabels(range, TZ)).toEqual({
        from: "2026-05-01",
        to: "2026-05-03",
      })
    })

    it("defaults to 30 days when no query", () => {
      const range = resolveDashboardRange({}, TZ, FIXED_NOW)
      expect(listDaysInRange(range, TZ)).toHaveLength(30)
    })
  })
})
