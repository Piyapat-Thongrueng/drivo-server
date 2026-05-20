import {
  bookingStatus,
  depositStatus,
} from "../db/schema"

export type BookingStatus = (typeof bookingStatus.enumValues)[number]

export type DepositStatus = (typeof depositStatus.enumValues)[number]

export interface BookingAddon {
  id: number
  bookingId: number
  addonId: number
  name: string
  pricePerDay: string
  totalPrice: string
  createdAt: string
}

export interface Booking {
  id: number
  reference: string
  userId: number
  carId: number
  pickupBranchId: number
  dropoffBranchId: number
  pickupDatetime: string
  dropoffDatetime: string
  actualPickupDatetime: string | null
  actualDropoffDatetime: string | null
  hourlyRate: string
  dailyRate: string
  baseAmount: string | null
  addonAmount: string
  oneWayFee: string
  damageCharge: string
  fuelCharge: string
  totalAmount: string | null
  depositAmount: string
  depositStatus: DepositStatus
  depositForfeitAmount: string
  currencyCode: string
  status: BookingStatus
  rejectionNote: string | null
  approvedBy: number | null
  approvedAt: string | null
  paymentDeadline: string | null
  confirmedAt: string | null
  cancelledAt: string | null
  completedAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/** Booking with nested addons — typical detail response shape. */
export interface BookingDetail extends Booking {
  addons: BookingAddon[]
}

export interface CreateBookingPayload {
  carId: number
  pickupBranchId: number
  dropoffBranchId: number
  pickupDatetime: string
  dropoffDatetime: string
  addonIds?: number[]
}
