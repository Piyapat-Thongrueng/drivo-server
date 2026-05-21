import { paymentService } from "../../services/payment.service"

const mockConstructEvent = jest.fn()
const mockPaymentIntentsCancel = jest.fn()

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
    paymentIntents: {
      cancel: mockPaymentIntentsCancel,
    },
  }))
})

jest.mock("../../config/stripe", () => ({
  getStripeSecretKey: () => "sk_test_mock",
  getStripeWebhookSecret: () => "whsec_test_mock",
}))

jest.mock("../../repositories/payment.repository", () => ({
  paymentRepository: {
    findByBookingId: jest.fn(),
    markRentalPaid: jest.fn(),
    markDepositHeld: jest.fn(),
    markFailed: jest.fn(),
    confirmBooking: jest.fn(),
    updateStripeIds: jest.fn(),
    findDepositPaymentIntentByBookingId: jest.fn(),
  },
}))

import { paymentRepository } from "../../repositories/payment.repository"

const mockRepo = paymentRepository as jest.Mocked<typeof paymentRepository>

const BOOKING_ID = 7
const RENTAL_PAYMENT_ID = 101
const DEPOSIT_PAYMENT_ID = 102

function paymentRow(
  paymentType: "rental" | "deposit",
  opts: { status?: "pending" | "paid" | "failed"; held?: boolean } = {},
) {
  const isRental = paymentType === "rental"
  const paid = opts.status === "paid"
  const status = opts.status ?? ("pending" as const)
  return {
    id: BigInt(isRental ? RENTAL_PAYMENT_ID : DEPOSIT_PAYMENT_ID),
    bookingId: BOOKING_ID,
    paymentType,
    amount: "5000.00",
    currencyCode: "THB",
    status,
    stripePaymentIntentId:
      paid || opts.held ? (isRental ? "pi_rental" : "pi_deposit") : null,
    stripeCheckoutSessionId: null,
    idempotencyKey: null,
    metadata: {},
    paidAt: paid ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function rentalRow(status: "pending" | "paid" = "pending") {
  return paymentRow("rental", { status })
}

function depositRow(held = false) {
  return paymentRow("deposit", { held })
}

function mockEvent(type: string, object: Record<string, unknown>) {
  mockConstructEvent.mockReturnValue({
    type,
    data: { object },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRepo.markRentalPaid.mockResolvedValue(rentalRow("paid"))
  mockRepo.markDepositHeld.mockResolvedValue(depositRow(true))
  mockRepo.confirmBooking.mockResolvedValue({
    id: BigInt(BOOKING_ID),
    status: "confirmed",
  } as never)
  mockRepo.markFailed.mockResolvedValue({} as never)
})

describe("paymentService.handleStripeWebhook", () => {
  const body = Buffer.from("{}")
  const signature = "sig_test"

  describe("checkout.session.completed", () => {
    const session = {
      id: "cs_test_123",
      payment_status: "paid",
      payment_intent: "pi_checkout_main",
      metadata: {
        bookingId: String(BOOKING_ID),
        rentalPaymentId: String(RENTAL_PAYMENT_ID),
        depositPaymentId: String(DEPOSIT_PAYMENT_ID),
        depositIntentId: "pi_deposit_pre",
      },
    }

    it("marks rental paid, deposit held, and confirms booking", async () => {
      mockEvent("checkout.session.completed", session)
      mockRepo.findByBookingId.mockResolvedValue([
        rentalRow("paid"),
        depositRow(true),
      ])

      const result = await paymentService.handleStripeWebhook(body, signature)

      expect(result).toEqual({ received: true })
      expect(mockRepo.markRentalPaid).toHaveBeenCalledWith(
        RENTAL_PAYMENT_ID,
        "pi_checkout_main",
        "cs_test_123",
      )
      expect(mockRepo.markDepositHeld).toHaveBeenCalledWith(
        DEPOSIT_PAYMENT_ID,
        "pi_deposit_pre",
        "cs_test_123",
      )
      expect(mockRepo.confirmBooking).toHaveBeenCalledWith(BOOKING_ID)
    })

    it("skips when payment_status is not paid", async () => {
      mockEvent("checkout.session.completed", {
        ...session,
        payment_status: "unpaid",
      })

      await paymentService.handleStripeWebhook(body, signature)

      expect(mockRepo.markRentalPaid).not.toHaveBeenCalled()
      expect(mockRepo.confirmBooking).not.toHaveBeenCalled()
    })

    it("skips when session metadata is missing booking ids", async () => {
      mockEvent("checkout.session.completed", {
        id: "cs_empty",
        payment_status: "paid",
        payment_intent: "pi_x",
        metadata: {},
      })

      await paymentService.handleStripeWebhook(body, signature)

      expect(mockRepo.markRentalPaid).not.toHaveBeenCalled()
    })

    it("is safe to process duplicate events (idempotent calls)", async () => {
      mockEvent("checkout.session.completed", session)
      mockRepo.findByBookingId.mockResolvedValue([
        rentalRow("paid"),
        depositRow(true),
      ])

      await paymentService.handleStripeWebhook(body, signature)
      await paymentService.handleStripeWebhook(body, signature)

      expect(mockRepo.markRentalPaid).toHaveBeenCalledTimes(2)
      expect(mockRepo.confirmBooking).toHaveBeenCalledTimes(2)
    })
  })

  describe("payment_intent.succeeded", () => {
    it("marks rental paid when metadata has rental paymentId", async () => {
      mockEvent("payment_intent.succeeded", {
        id: "pi_rental_meta",
        metadata: {
          bookingId: String(BOOKING_ID),
          paymentType: "rental",
          paymentId: String(RENTAL_PAYMENT_ID),
        },
      })
      mockRepo.findByBookingId.mockResolvedValue([
        rentalRow("paid"),
        depositRow(false),
      ])

      await paymentService.handleStripeWebhook(body, signature)

      expect(mockRepo.markRentalPaid).toHaveBeenCalledWith(
        RENTAL_PAYMENT_ID,
        "pi_rental_meta",
        "",
      )
      expect(mockRepo.confirmBooking).not.toHaveBeenCalled()
    })

    it("ignores PI without our metadata (Checkout-created PI)", async () => {
      mockEvent("payment_intent.succeeded", {
        id: "pi_no_meta",
        metadata: {},
      })

      await paymentService.handleStripeWebhook(body, signature)

      expect(mockRepo.markRentalPaid).not.toHaveBeenCalled()
    })

    it("skips deposit type on succeeded (handled via capturable_updated)", async () => {
      mockEvent("payment_intent.succeeded", {
        id: "pi_dep",
        metadata: {
          bookingId: String(BOOKING_ID),
          paymentType: "deposit",
          paymentId: String(DEPOSIT_PAYMENT_ID),
        },
      })

      await paymentService.handleStripeWebhook(body, signature)

      expect(mockRepo.markRentalPaid).not.toHaveBeenCalled()
    })
  })

  describe("payment_intent.amount_capturable_updated", () => {
    it("marks deposit held and tries confirm", async () => {
      mockEvent("payment_intent.amount_capturable_updated", {
        id: "pi_dep_hold",
        metadata: {
          bookingId: String(BOOKING_ID),
          paymentId: String(DEPOSIT_PAYMENT_ID),
        },
      })
      mockRepo.findByBookingId.mockResolvedValue([
        rentalRow("paid"),
        depositRow(true),
      ])

      await paymentService.handleStripeWebhook(body, signature)

      expect(mockRepo.markDepositHeld).toHaveBeenCalledWith(
        DEPOSIT_PAYMENT_ID,
        "pi_dep_hold",
        "",
      )
      expect(mockRepo.confirmBooking).toHaveBeenCalledWith(BOOKING_ID)
    })
  })

  describe("payment_intent.payment_failed", () => {
    it("marks payment row as failed", async () => {
      mockEvent("payment_intent.payment_failed", {
        id: "pi_fail",
        metadata: { paymentId: String(RENTAL_PAYMENT_ID) },
      })

      await paymentService.handleStripeWebhook(body, signature)

      expect(mockRepo.markFailed).toHaveBeenCalledWith(RENTAL_PAYMENT_ID)
      expect(mockRepo.confirmBooking).not.toHaveBeenCalled()
    })
  })

  describe("tryConfirmBooking via rental+deposit", () => {
    it("does not confirm when only rental is paid", async () => {
      mockEvent("payment_intent.succeeded", {
        id: "pi_r",
        metadata: {
          bookingId: String(BOOKING_ID),
          paymentType: "rental",
          paymentId: String(RENTAL_PAYMENT_ID),
        },
      })
      mockRepo.findByBookingId.mockResolvedValue([
        rentalRow("paid"),
        depositRow(false),
      ])

      await paymentService.handleStripeWebhook(body, signature)

      expect(mockRepo.confirmBooking).not.toHaveBeenCalled()
    })
  })

  it("rejects invalid webhook signature", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature")
    })

    await expect(
      paymentService.handleStripeWebhook(body, "bad_sig"),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it("ignores unhandled event types without error", async () => {
    mockEvent("charge.succeeded", { id: "ch_1" })

    const result = await paymentService.handleStripeWebhook(body, signature)

    expect(result).toEqual({ received: true })
    expect(mockRepo.markRentalPaid).not.toHaveBeenCalled()
  })
})
