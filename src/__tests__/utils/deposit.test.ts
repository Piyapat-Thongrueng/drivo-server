import { resolveCountryDepositAmount, calculateDepositSettlement } from "../../utils/deposit"

describe("resolveCountryDepositAmount", () => {
  it("returns numeric value when country default is a positive string", () => {
    expect(resolveCountryDepositAmount("5000")).toBe(5000)
  })

  it("returns numeric value when country default is a positive number", () => {
    expect(resolveCountryDepositAmount(6000)).toBe(6000)
  })

  it("throws 409 when deposit is zero", () => {
    expect(() => resolveCountryDepositAmount("0")).toThrow(
      expect.objectContaining({
        message: "Deposit amount is not configured for this country. Please contact support.",
        statusCode: 409,
        isAppError: true,
      }),
    )
  })

  it("throws 409 when deposit is null or missing", () => {
    const expected = expect.objectContaining({
      statusCode: 409,
      isAppError: true,
    })
    expect(() => resolveCountryDepositAmount(null)).toThrow(expected)
    expect(() => resolveCountryDepositAmount(undefined)).toThrow(expected)
  })

  it("throws 409 when deposit is not a valid number", () => {
    expect(() => resolveCountryDepositAmount("invalid")).toThrow(
      expect.objectContaining({
        statusCode: 409,
        isAppError: true,
      }),
    )
  })
})

describe("calculateDepositSettlement", () => {
  const DEPOSIT = 5000

  it("returns released + full refund when extraCharge is 0", () => {
    const result = calculateDepositSettlement(DEPOSIT, 0)
    expect(result).toEqual({
      refundAmount: 5000,
      forfeitAmount: 0,
      depositStatus: "released",
    })
  })

  it("returns partial + correct amounts when extraCharge is between 0 and deposit", () => {
    const result = calculateDepositSettlement(DEPOSIT, 2000)
    expect(result).toEqual({
      refundAmount: 3000,
      forfeitAmount: 2000,
      depositStatus: "partial",
    })
  })

  it("returns forfeited when extraCharge equals deposit", () => {
    const result = calculateDepositSettlement(DEPOSIT, 5000)
    expect(result).toEqual({
      refundAmount: 0,
      forfeitAmount: 5000,
      depositStatus: "forfeited",
    })
  })

  it("throws 400 when extraCharge exceeds deposit", () => {
    expect(() => calculateDepositSettlement(DEPOSIT, 6000)).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    )
  })

  it("throws 400 when extraCharge is negative", () => {
    expect(() => calculateDepositSettlement(DEPOSIT, -100)).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    )
  })

  it("throws 400 when depositAmount is zero or negative", () => {
    expect(() => calculateDepositSettlement(0, 0)).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    )
  })

  it("handles fractional amounts correctly (e.g. 1 satang)", () => {
    const result = calculateDepositSettlement(5000, 0.01)
    expect(result.depositStatus).toBe("partial")
    expect(result.forfeitAmount).toBeCloseTo(0.01)
    expect(result.refundAmount).toBeCloseTo(4999.99)
  })
})
