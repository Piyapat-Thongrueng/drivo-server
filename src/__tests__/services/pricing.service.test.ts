import { pricingService } from "../../services/pricing.service"

jest.mock("../../db", () => ({
  db: {
    select: jest.fn(),
  },
}))

import { db } from "../../db"

const mockDb = db as jest.Mocked<typeof db>

function mockSelectChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(rows),
        }),
      }),
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(rows),
      }),
    }),
  }
}

const previewDto = {
  carId: 10,
  pickupBranchId: 1,
  dropoffBranchId: 1,
  pickupDatetime: "2026-06-01T10:00:00+07:00",
  dropoffDatetime: "2026-06-01T14:00:00+07:00",
  addonIds: [] as number[],
}

const fakeCar = {
  id: 10n,
  hourlyRate: "200.00",
  dailyRate: "1500.00",
  currentBranchId: 1,
  status: "available",
}

const fakeBranch = {
  branchId: 1n,
  countryId: 1,
  timezone: "Asia/Bangkok",
  currencyCode: "THB",
  defaultDepositAmount: "6000.00",
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("pricingService.previewPricing", () => {
  it("uses defaultDepositAmount from country in breakdown", async () => {
    mockDb.select
      .mockReturnValueOnce(mockSelectChain([fakeCar]) as never)
      .mockReturnValueOnce(mockSelectChain([fakeBranch]) as never)

    const result = await pricingService.previewPricing(previewDto)

    expect(result.depositAmount).toBe(6000)
    expect(result.currencyCode).toBe("THB")
    expect(result.totalAmount).toBeGreaterThan(0)
  })

  it("throws 409 when country deposit is not configured", async () => {
    mockDb.select
      .mockReturnValueOnce(mockSelectChain([fakeCar]) as never)
      .mockReturnValueOnce(
        mockSelectChain([{ ...fakeBranch, defaultDepositAmount: "0" }]) as never,
      )

    await expect(pricingService.previewPricing(previewDto)).rejects.toMatchObject({
      message: "Deposit amount is not configured for this country. Please contact support.",
      statusCode: 409,
      isAppError: true,
    })
  })

  it("throws 400 when drop-off is not after pick-up", async () => {
    await expect(
      pricingService.previewPricing({
        ...previewDto,
        dropoffDatetime: previewDto.pickupDatetime,
      }),
    ).rejects.toMatchObject({
      message: "Drop-off must be after pick-up",
      statusCode: 400,
      isAppError: true,
    })

    expect(mockDb.select).not.toHaveBeenCalled()
  })
})
