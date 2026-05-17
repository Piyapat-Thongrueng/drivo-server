import { resolveCountryDepositAmount } from "../../utils/deposit"

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
