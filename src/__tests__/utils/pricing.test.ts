import {
  calculateDaysAndHours,
  calculatePricing,
  calculateAddonAmount,
} from "../../utils/pricing"
import pricingCases from "../fixtures/pricing-cases.json"

const TZ = pricingCases.timezone

// ─── calculateDaysAndHours — shared fixtures ────────────────────────────────

describe("calculateDaysAndHours — shared fixtures", () => {
  pricingCases.cases.forEach(({ id, description, pickup, dropoff, expected }) => {
    it(`[${id}] ${description}`, () => {
      const result = calculateDaysAndHours(pickup, dropoff, TZ)
      expect(result.days).toBe(expected.days)
      expect(result.hours).toBe(expected.hours)
    })
  })
})

// ─── calculatePricing ───────────────────────────────────────────────────────

describe("calculatePricing", () => {
  const dailyRate = 1000
  const hourlyRate = 100
  const deposit = 5000

  it("2 hours → baseAmount = 200, total = 200", () => {
    const result = calculatePricing(
      "2026-06-10T10:00:00+07:00",
      "2026-06-10T12:00:00+07:00",
      TZ,
      dailyRate,
      hourlyRate,
      0,
      0,
      deposit,
    )
    expect(result.days).toBe(0)
    expect(result.hours).toBe(2)
    expect(result.baseAmount).toBe(200)
    expect(result.totalAmount).toBe(200)
    expect(result.depositAmount).toBe(deposit)
  })

  it("10:00 → 14:00 sharp → 4 hours billed (reviewer)", () => {
    const result = calculatePricing(
      "2026-06-10T10:00:00+07:00",
      "2026-06-10T14:00:00+07:00",
      TZ,
      dailyRate,
      hourlyRate,
      0,
      0,
      deposit,
    )
    expect(result.days).toBe(0)
    expect(result.hours).toBe(4)
    expect(result.baseAmount).toBe(400)
  })

  it("1 full day → baseAmount = 1000", () => {
    const result = calculatePricing(
      "2026-06-10T10:00:00+07:00",
      "2026-06-10T15:00:00+07:00",
      TZ,
      dailyRate,
      hourlyRate,
      0,
      0,
      deposit,
    )
    expect(result.days).toBe(1)
    expect(result.hours).toBe(0)
    expect(result.baseAmount).toBe(1000)
    expect(result.totalAmount).toBe(1000)
  })

  it("adds addonAmount and oneWayFee to total", () => {
    const result = calculatePricing(
      "2026-06-10T10:00:00+07:00",
      "2026-06-10T15:00:00+07:00",
      TZ,
      dailyRate,
      hourlyRate,
      500,
      200,
      deposit,
    )
    expect(result.totalAmount).toBe(1700)
    expect(result.addonAmount).toBe(500)
    expect(result.oneWayFee).toBe(200)
  })

  it("multi-day 1 day + 1 hour → baseAmount = 1100", () => {
    const result = calculatePricing(
      "2026-06-10T10:00:00+07:00",
      "2026-06-11T11:00:00+07:00",
      TZ,
      dailyRate,
      hourlyRate,
      0,
      0,
      deposit,
    )
    expect(result.days).toBe(1)
    expect(result.hours).toBe(1)
    expect(result.baseAmount).toBe(1100)
    expect(result.totalAmount).toBe(1100)
  })

  it("depositAmount does NOT affect totalAmount", () => {
    const result = calculatePricing(
      "2026-06-10T10:00:00+07:00",
      "2026-06-10T12:00:00+07:00",
      TZ,
      dailyRate,
      hourlyRate,
      0,
      0,
      5000,
    )
    expect(result.totalAmount).toBe(200)
    expect(result.depositAmount).toBe(5000)
  })
})

// ─── calculateAddonAmount ───────────────────────────────────────────────────

describe("calculateAddonAmount", () => {
  it("charges addons per billing day", () => {
    const addons = [{ pricePerDay: 200 }, { pricePerDay: 300 }]
    expect(calculateAddonAmount(addons, 3)).toBe(1500)
  })

  it("uses 1 day minimum when billingDays = 0 (hourly booking)", () => {
    const addons = [{ pricePerDay: 200 }]
    expect(calculateAddonAmount(addons, 0)).toBe(200)
  })

  it("returns 0 for empty addons", () => {
    expect(calculateAddonAmount([], 2)).toBe(0)
  })
})
