/**
 * Unit tests for handoverService
 *
 * Mock ทั้ง handoverRepository และ paymentService เพื่อทดสอบ business logic
 * โดยไม่แตะ DB หรือ Stripe จริง
 */

import { handoverService } from "../../services/handover.service"
import type { AuthenticatedUser } from "../../types"
import type { BookingDetailForHandover } from "../../repositories/handover.repository"

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../../repositories/handover.repository", () => ({
  handoverRepository: {
    findPickupQueue: jest.fn(),
    findReturnQueue: jest.fn(),
    findBookingDetailForHandover: jest.fn(),
    insertPickup: jest.fn(),
    insertReturn: jest.fn(),
    findDepositPaymentByBookingId: jest.fn(),
    findBranchById: jest.fn(),
  },
}))

jest.mock("../../services/payment.service", () => ({
  paymentService: {
    settleDepositOnReturn: jest.fn(),
  },
}))

import { handoverRepository } from "../../repositories/handover.repository"
import { paymentService } from "../../services/payment.service"

const mockRepo = handoverRepository as jest.Mocked<typeof handoverRepository>
const mockPayment = paymentService as jest.Mocked<typeof paymentService>

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const branchStaff: AuthenticatedUser = { id: 10, role: "branch_staff", branchId: 1 }
const otherBranchStaff: AuthenticatedUser = { id: 20, role: "branch_staff", branchId: 2 }
const staffNoBranch: AuthenticatedUser = { id: 30, role: "branch_staff", branchId: null }

const BOOKING_ID = 100
const DEPOSIT_AMOUNT = 5000

function makeBooking(overrides: Partial<BookingDetailForHandover> = {}): BookingDetailForHandover {
  return {
    bookingId: BOOKING_ID,
    reference: "DRV-TEST-001",
    status: "confirmed",
    pickupBranchId: 1,
    dropoffBranchId: 1,
    depositAmount: String(DEPOSIT_AMOUNT),
    currencyCode: "THB",
    carId: 50,
    customer: { firstName: "John", lastName: "Doe", phone: null },
    car: { make: "Toyota", model: "Camry", year: 2024, licensePlate: "1กข1234" },
    pickupBranchName: "BKK Airport",
    dropoffBranchName: "BKK Airport",
    pickupDatetime: "2026-06-01T10:00:00+07:00",
    dropoffDatetime: "2026-06-03T10:00:00+07:00",
    addons: [],
    handovers: [],
    ...overrides,
  }
}

/** Booking ที่ confirmed รอ pickup ที่สาขา 1 */
function confirmedBooking(overrides: Partial<BookingDetailForHandover> = {}): BookingDetailForHandover {
  return makeBooking({ status: "confirmed", ...overrides })
}

function validPhotos() {
  return [
    { angle: "front" as const, storagePath: "bookings/100/pickup/front/a.jpg", url: "https://cdn.example.com/a.jpg" },
    { angle: "back" as const, storagePath: "bookings/100/pickup/back/b.jpg", url: "https://cdn.example.com/b.jpg" },
    { angle: "left" as const, storagePath: "bookings/100/pickup/left/c.jpg", url: "https://cdn.example.com/c.jpg" },
    { angle: "right" as const, storagePath: "bookings/100/pickup/right/d.jpg", url: "https://cdn.example.com/d.jpg" },
  ]
}

const fakeInsertResult = {
  handover: { id: 1, bookingId: BOOKING_ID, type: "pickup" },
  booking: { id: BOOKING_ID, status: "active" },
}

// ─── getBranchInfo ─────────────────────────────────────────────────────────────

describe("handoverService.getBranchInfo", () => {
  it("returns branch name when staff has valid branchId", async () => {
    mockRepo.findBranchById.mockResolvedValueOnce({ id: BigInt(1), name: "BKK Airport" })
    const result = await handoverService.getBranchInfo(branchStaff)
    expect(result).toEqual({ branchId: 1, branchName: "BKK Airport" })
    expect(mockRepo.findBranchById).toHaveBeenCalledWith(1)
  })

  it("throws 403 when staff has no branchId", async () => {
    await expect(handoverService.getBranchInfo(staffNoBranch)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it("throws 404 when branch not found in DB", async () => {
    mockRepo.findBranchById.mockResolvedValueOnce(null as never)
    await expect(handoverService.getBranchInfo(branchStaff)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

// ─── submitPickup ──────────────────────────────────────────────────────────────

describe("handoverService.submitPickup", () => {
  const dto = { fuelLevel: "full" as const, photos: validPhotos() }

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepo.findBookingDetailForHandover.mockResolvedValue(confirmedBooking())
    mockRepo.insertPickup.mockResolvedValue(fakeInsertResult as never)
  })

  it("succeeds for valid confirmed booking at staff's branch", async () => {
    const result = await handoverService.submitPickup(BOOKING_ID, dto, branchStaff)
    expect(mockRepo.insertPickup).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: BOOKING_ID,
        branchId: 1,
        handledBy: 10,
        fuelLevel: "full",
      }),
    )
    expect(result).toBeDefined()
  })

  it("throws 404 when booking not found", async () => {
    mockRepo.findBookingDetailForHandover.mockResolvedValue(null)
    await expect(handoverService.submitPickup(BOOKING_ID, dto, branchStaff)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it("throws 409 when booking is not confirmed (e.g. active)", async () => {
    mockRepo.findBookingDetailForHandover.mockResolvedValue(
      makeBooking({ status: "active" }),
    )
    await expect(handoverService.submitPickup(BOOKING_ID, dto, branchStaff)).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it("throws 403 when pickup branch does not match staff branch", async () => {
    await expect(
      handoverService.submitPickup(BOOKING_ID, dto, otherBranchStaff),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it("throws 409 when pickup handover already exists", async () => {
    mockRepo.findBookingDetailForHandover.mockResolvedValue(
      confirmedBooking({
        handovers: [{ id: 99, type: "pickup", fuelLevel: "full", extraCharge: "0", photos: [] }],
      }),
    )
    await expect(handoverService.submitPickup(BOOKING_ID, dto, branchStaff)).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it("throws 403 when staff has no branchId", async () => {
    await expect(
      handoverService.submitPickup(BOOKING_ID, dto, staffNoBranch),
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})

// ─── submitReturn ──────────────────────────────────────────────────────────────

describe("handoverService.submitReturn", () => {
  const activeBooking = makeBooking({
    status: "active",
    handovers: [{ id: 1, type: "pickup", fuelLevel: "full", extraCharge: "0", photos: [] }],
  })

  const returnDto = { fuelLevel: "half" as const, extraCharge: 0, photos: validPhotos() }

  const settlementFull = { refundAmount: 5000, forfeitAmount: 0, depositStatus: "released" }

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepo.findBookingDetailForHandover.mockResolvedValue(activeBooking)
    mockPayment.settleDepositOnReturn.mockResolvedValue(settlementFull as never)
    mockRepo.insertReturn.mockResolvedValue({ handover: { id: 2 }, booking: { id: BOOKING_ID } } as never)
  })

  it("succeeds: settles deposit + inserts return handover", async () => {
    await handoverService.submitReturn(BOOKING_ID, returnDto, branchStaff)
    expect(mockPayment.settleDepositOnReturn).toHaveBeenCalledWith(BOOKING_ID, 0, DEPOSIT_AMOUNT)
    expect(mockRepo.insertReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: BOOKING_ID,
        branchId: 1,
        handledBy: 10,
        extraCharge: 0,
        depositStatusValue: "released",
        forfeitAmount: 0,
      }),
    )
  })

  it("throws 409 when booking is not active (still confirmed)", async () => {
    mockRepo.findBookingDetailForHandover.mockResolvedValue(makeBooking({ status: "confirmed" }))
    await expect(
      handoverService.submitReturn(BOOKING_ID, returnDto, branchStaff),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(mockPayment.settleDepositOnReturn).not.toHaveBeenCalled()
  })

  it("throws 403 when dropoff branch does not match staff branch", async () => {
    await expect(
      handoverService.submitReturn(BOOKING_ID, returnDto, otherBranchStaff),
    ).rejects.toMatchObject({ statusCode: 403 })
    expect(mockPayment.settleDepositOnReturn).not.toHaveBeenCalled()
  })

  it("throws 409 when pickup handover is missing", async () => {
    mockRepo.findBookingDetailForHandover.mockResolvedValue(
      makeBooking({ status: "active", handovers: [] }),
    )
    await expect(
      handoverService.submitReturn(BOOKING_ID, returnDto, branchStaff),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it("throws 409 when return handover already exists", async () => {
    mockRepo.findBookingDetailForHandover.mockResolvedValue(
      makeBooking({
        status: "active",
        handovers: [
          { id: 1, type: "pickup", fuelLevel: "full", extraCharge: "0", photos: [] },
          { id: 2, type: "return", fuelLevel: "half", extraCharge: "0", photos: [] },
        ],
      }),
    )
    await expect(
      handoverService.submitReturn(BOOKING_ID, returnDto, branchStaff),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it("throws 400 when extraCharge exceeds depositAmount", async () => {
    const dtoOverCharge = { ...returnDto, extraCharge: 9999 }
    await expect(
      handoverService.submitReturn(BOOKING_ID, dtoOverCharge, branchStaff),
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(mockPayment.settleDepositOnReturn).not.toHaveBeenCalled()
  })

  it("does NOT commit DB when Stripe settlement fails", async () => {
    mockPayment.settleDepositOnReturn.mockRejectedValue({ statusCode: 502, isAppError: true })
    await expect(
      handoverService.submitReturn(BOOKING_ID, returnDto, branchStaff),
    ).rejects.toMatchObject({ statusCode: 502 })
    expect(mockRepo.insertReturn).not.toHaveBeenCalled()
  })

  it("passes partial forfeit amount correctly to DB", async () => {
    const partialDto = { ...returnDto, extraCharge: 2000 }
    mockPayment.settleDepositOnReturn.mockResolvedValue({
      refundAmount: 3000,
      forfeitAmount: 2000,
      depositStatus: "partial",
    } as never)

    await handoverService.submitReturn(BOOKING_ID, partialDto, branchStaff)

    expect(mockRepo.insertReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        forfeitAmount: 2000,
        depositStatusValue: "partial",
        extraCharge: 2000,
      }),
    )
  })
})

// ─── getBookingDetail ──────────────────────────────────────────────────────────

describe("handoverService.getBookingDetail", () => {
  it("allows pickup branch staff to view their booking", async () => {
    mockRepo.findBookingDetailForHandover.mockResolvedValue(confirmedBooking())
    const result = await handoverService.getBookingDetail(BOOKING_ID, branchStaff)
    expect(result).toBeDefined()
  })

  it("throws 403 when staff is from a different branch", async () => {
    mockRepo.findBookingDetailForHandover.mockResolvedValue(confirmedBooking())
    await expect(
      handoverService.getBookingDetail(BOOKING_ID, otherBranchStaff),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it("allows dropoff branch staff to view one-way booking", async () => {
    // one-way: pickup branch 1, dropoff branch 2
    mockRepo.findBookingDetailForHandover.mockResolvedValue(
      makeBooking({ pickupBranchId: 1, dropoffBranchId: 2 }),
    )
    const result = await handoverService.getBookingDetail(BOOKING_ID, otherBranchStaff)
    expect(result).toBeDefined()
  })
})
