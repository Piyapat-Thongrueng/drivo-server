import {
  buildDailySeries,
  computeTotalRevenue,
  mergeAmountsByCurrency,
  sumAmountStrings,
} from "../../utils/dashboard-aggregates"

describe("dashboard-aggregates", () => {
  describe("sumAmountStrings", () => {
    it("sums numeric strings with 2 decimal places", () => {
      expect(sumAmountStrings(["100.50", "25", "0.5"])).toBe("126.00")
    })

    it("returns 0.00 for empty array", () => {
      expect(sumAmountStrings([])).toBe("0.00")
    })
  })

  describe("computeTotalRevenue", () => {
    it("adds rental and damage only", () => {
      expect(computeTotalRevenue("110000.00", "8000.00")).toBe("118000.00")
    })
  })

  describe("mergeAmountsByCurrency", () => {
    it("groups by currency code", () => {
      const map = mergeAmountsByCurrency([
        { currency: "THB", amount: "100.00" },
        { currency: "THB", amount: "50.00" },
        { currency: "JPY", amount: "1000" },
      ])
      expect(map.THB).toBe("150.00")
      expect(map.JPY).toBe("1000.00")
    })
  })

  describe("buildDailySeries", () => {
    it("fills missing days with zero", () => {
      const days = ["2026-05-01", "2026-05-02", "2026-05-03"]
      const series = buildDailySeries(
        days,
        [
          { day: "2026-05-01", currency: "THB", rental: "100", damage: "0" },
          { day: "2026-05-03", currency: "THB", rental: "50", damage: "10" },
        ],
        "THB",
      )
      expect(series).toHaveLength(1)
      expect(series[0].points).toEqual([100, 0, 60])
    })

    it("returns multiple currencies when no filter", () => {
      const days = ["2026-05-01"]
      const series = buildDailySeries(days, [
        { day: "2026-05-01", currency: "THB", rental: "10", damage: "0" },
        { day: "2026-05-01", currency: "GBP", rental: "5", damage: "0" },
      ])
      expect(series.map((s) => s.currency).sort()).toEqual(["GBP", "THB"])
    })
  })
})
