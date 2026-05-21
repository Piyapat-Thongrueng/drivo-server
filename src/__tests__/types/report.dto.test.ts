import { dashboardQuerySchema } from "../../types/dto/report.dto"

describe("dashboardQuerySchema", () => {
  it("accepts empty query (defaults handled in service)", () => {
    const result = dashboardQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts period 7 or 30", () => {
    expect(dashboardQuerySchema.safeParse({ period: "7" }).success).toBe(true)
    expect(dashboardQuerySchema.safeParse({ period: "30" }).success).toBe(true)
  })

  it("rejects invalid period", () => {
    const result = dashboardQuerySchema.safeParse({ period: "14" })
    expect(result.success).toBe(false)
  })

  it("accepts custom from and to together", () => {
    const result = dashboardQuerySchema.safeParse({
      from: "2026-05-01",
      to: "2026-05-21",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.from).toBe("2026-05-01")
      expect(result.data.to).toBe("2026-05-21")
    }
  })

  it("rejects from without to", () => {
    const result = dashboardQuerySchema.safeParse({ from: "2026-05-01" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("from and to")
    }
  })

  it("rejects invalid date format", () => {
    const result = dashboardQuerySchema.safeParse({
      from: "05/01/2026",
      to: "2026-05-21",
    })
    expect(result.success).toBe(false)
  })

  it("accepts chartCurrency with 3 letters", () => {
    const result = dashboardQuerySchema.safeParse({
      period: "30",
      chartCurrency: "THB",
    })
    expect(result.success).toBe(true)
  })

  it("rejects chartCurrency that is not 3 characters", () => {
    const result = dashboardQuerySchema.safeParse({
      chartCurrency: "THBB",
    })
    expect(result.success).toBe(false)
  })
})
