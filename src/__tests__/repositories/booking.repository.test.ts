import { bookingRepository } from "../../repositories/booking.repository"

jest.mock("../../db", () => ({
  db: {
    update: jest.fn(),
  },
}))

import { db } from "../../db"

const mockDb = db as jest.Mocked<typeof db>

beforeEach(() => {
  jest.clearAllMocks()
})

describe("bookingRepository.cancelExpiredBookings", () => {
  it("updates pending_payment bookings past payment_deadline to cancelled", async () => {
    const cancelledRows = [
      { id: 1n, reference: "DRV-20260601-ABCD", status: "cancelled" },
    ]

    const mockReturning = jest.fn().mockResolvedValue(cancelledRows)
    const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning })
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere })
    mockDb.update.mockReturnValue({ set: mockSet } as never)

    const result = await bookingRepository.cancelExpiredBookings()

    expect(mockDb.update).toHaveBeenCalledTimes(1)
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "cancelled",
        cancelledAt: expect.any(String),
      }),
    )
    expect(result).toEqual(cancelledRows)
  })
})
