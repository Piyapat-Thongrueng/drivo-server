import { bookingService } from "../../services/booking.service"
import type { AuthenticatedUser } from "../../types"

jest.mock("../../repositories/booking.repository", () => ({
  bookingRepository: {
    findByUserId: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    hasOverlap: jest.fn(),
    create: jest.fn(),
    createAddons: jest.fn(),
    approveBooking: jest.fn(),
    rejectBooking: jest.fn(),
    cancelBooking: jest.fn(),
    cancelExpiredBookings: jest.fn(),
  },
}))

jest.mock("../../db", () => ({
  db: {
    select: jest.fn(),
  },
}))

import { bookingRepository } from "../../repositories/booking.repository"
import { db } from "../../db"

const mockRepo = bookingRepository as jest.Mocked<typeof bookingRepository>
const mockDb = db as jest.Mocked<typeof db>

const user: AuthenticatedUser = { id: 1, role: "user", branchId: null }
const admin: AuthenticatedUser = { id: 99, role: "super_admin", branchId: null }
const otherUser: AuthenticatedUser = { id: 2, role: "user", branchId: null }

const fakeBooking = {
  id: 1,
  reference: "DRV-20260601-TEST",
  userId: 1,
  carId: 10,
  pickupBranchId: 1,
  dropoffBranchId: 1,
  pickupDatetime: "2026-06-01T10:00:00+07:00",
  dropoffDatetime: "2026-06-01T14:00:00+07:00",
  hourlyRate: "200.00",
  dailyRate: "1500.00",
  baseAmount: "800.00",
  addonAmount: "0.00",
  oneWayFee: "0.00",
  totalAmount: "800.00",
  depositAmount: "5000.00",
  depositStatus: "held" as const,
  currencyCode: "THB",
  status: "pending_approval" as const,
  rejectionNote: null,
  approvedBy: null,
  approvedAt: null,
  paymentDeadline: null,
  confirmedAt: null,
  cancelledAt: null,
  completedAt: null,
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  depositForfeitAmount: "0.00",
  addons: [],
}

const createDto = {
  carId: 10,
  pickupBranchId: 1,
  dropoffBranchId: 1,
  pickupDatetime: "2026-06-01T10:00:00+07:00",
  dropoffDatetime: "2026-06-01T14:00:00+07:00",
  addonIds: [] as number[],
}

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

beforeEach(() => {
  jest.clearAllMocks()
})

describe("bookingService.createBooking", () => {
  it("throws 400 when drop-off is not after pick-up", async () => {
    await expect(
      bookingService.createBooking(
        { ...createDto, dropoffDatetime: createDto.pickupDatetime },
        user,
      ),
    ).rejects.toMatchObject({
      message: "Drop-off must be after pick-up",
      statusCode: 400,
      isAppError: true,
    })

    expect(mockRepo.hasOverlap).not.toHaveBeenCalled()
  })

  it("throws 409 when car has overlapping booking", async () => {
    mockDb.select
      .mockReturnValueOnce(
        mockSelectChain([
          {
            id: 10n,
            status: "available",
            currentBranchId: 1,
            hourlyRate: "200.00",
            dailyRate: "1500.00",
          },
        ]) as never,
      )
      .mockReturnValueOnce(
        mockSelectChain([
          {
            id: 1n,
            timezone: "Asia/Bangkok",
            currencyCode: "THB",
            defaultDepositAmount: "5000.00",
          },
        ]) as never,
      )

    mockRepo.hasOverlap.mockResolvedValue(true)

    await expect(bookingService.createBooking(createDto, user)).rejects.toMatchObject({
      message: "Car is already booked for the selected period",
      statusCode: 409,
      isAppError: true,
    })
  })
})

describe("bookingService.getBooking", () => {
  it("returns booking for owner", async () => {
    mockRepo.findById.mockResolvedValue(fakeBooking as never)

    const result = await bookingService.getBooking(1, user)

    expect(result.reference).toBe("DRV-20260601-TEST")
  })

  it("throws 403 when user is not owner or admin", async () => {
    mockRepo.findById.mockResolvedValue(fakeBooking as never)

    await expect(bookingService.getBooking(1, otherUser)).rejects.toMatchObject({
      message: "You do not have permission to view this booking",
      statusCode: 403,
      isAppError: true,
    })
  })

  it("allows super_admin to view any booking", async () => {
    mockRepo.findById.mockResolvedValue(fakeBooking as never)

    await expect(bookingService.getBooking(1, admin)).resolves.toMatchObject({
      id: 1,
    })
  })
})

describe("bookingService.cancelBooking", () => {
  it("cancels pending_approval booking for owner", async () => {
    mockRepo.findById.mockResolvedValue(fakeBooking as never)
    mockRepo.cancelBooking.mockResolvedValue({
      ...fakeBooking,
      status: "cancelled",
    } as never)

    const result = await bookingService.cancelBooking(1, user)

    expect(mockRepo.cancelBooking).toHaveBeenCalledWith(1)
    expect(result.status).toBe("cancelled")
  })

  it("throws 409 when booking status cannot be cancelled", async () => {
    mockRepo.findById.mockResolvedValue({
      ...fakeBooking,
      status: "confirmed",
    } as never)

    await expect(bookingService.cancelBooking(1, user)).rejects.toMatchObject({
      message: 'Cannot cancel a booking with status "confirmed"',
      statusCode: 409,
      isAppError: true,
    })
  })
})

describe("bookingService.approveBooking", () => {
  it("approves pending_approval and passes deposit to repository", async () => {
    mockRepo.findById.mockResolvedValue(fakeBooking as never)
    mockRepo.approveBooking.mockResolvedValue({
      ...fakeBooking,
      status: "pending_payment",
    } as never)

    const result = await bookingService.approveBooking(1, admin)

    expect(mockRepo.approveBooking).toHaveBeenCalledWith(
      1,
      admin.id,
      expect.any(String),
      "800.00",
      "5000.00",
      "THB",
    )
    expect(result.status).toBe("pending_payment")
  })

  it("throws 409 when booking is not pending_approval", async () => {
    mockRepo.findById.mockResolvedValue({
      ...fakeBooking,
      status: "pending_payment",
    } as never)

    await expect(bookingService.approveBooking(1, admin)).rejects.toMatchObject({
      message: 'Cannot approve a booking with status "pending_payment"',
      statusCode: 409,
      isAppError: true,
    })
  })
})

describe("bookingService.rejectBooking", () => {
  it("rejects pending_approval with note", async () => {
    mockRepo.findById.mockResolvedValue(fakeBooking as never)
    mockRepo.rejectBooking.mockResolvedValue({
      ...fakeBooking,
      status: "rejected",
      rejectionNote: "Unavailable",
    } as never)

    const result = await bookingService.rejectBooking(
      1,
      { rejectionNote: "Unavailable" },
      admin,
    )

    expect(mockRepo.rejectBooking).toHaveBeenCalledWith(1, "Unavailable")
    expect(result.status).toBe("rejected")
  })
})

describe("bookingService.listMyBookings", () => {
  it("returns bookings for the authenticated user", async () => {
    mockRepo.findByUserId.mockResolvedValue([fakeBooking] as never)

    const result = await bookingService.listMyBookings(user)

    expect(mockRepo.findByUserId).toHaveBeenCalledWith(1)
    expect(result).toHaveLength(1)
  })
})
