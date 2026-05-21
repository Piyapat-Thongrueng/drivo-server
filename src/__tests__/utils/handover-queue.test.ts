/**
 * Tests for handover queue eligibility (Phase 5 one-way + Phase 6 queue rules).
 */

import {
  isOneWayRental,
  canStaffViewBooking,
  isEligibleForPickupQueue,
  isEligibleForReturnQueue,
} from "../../utils/handover-queue"

const BRANCH_A = 1
const BRANCH_B = 2

describe("isOneWayRental", () => {
  it("returns true when pickup and dropoff branches differ", () => {
    expect(isOneWayRental(BRANCH_A, BRANCH_B)).toBe(true)
  })

  it("returns false for same-branch round trip", () => {
    expect(isOneWayRental(BRANCH_A, BRANCH_A)).toBe(false)
  })
})

describe("canStaffViewBooking", () => {
  it("allows pickup-branch staff", () => {
    expect(canStaffViewBooking(BRANCH_A, BRANCH_B, BRANCH_A)).toBe(true)
  })

  it("allows dropoff-branch staff on one-way", () => {
    expect(canStaffViewBooking(BRANCH_A, BRANCH_B, BRANCH_B)).toBe(true)
  })

  it("denies unrelated branch staff", () => {
    expect(canStaffViewBooking(BRANCH_A, BRANCH_B, 99)).toBe(false)
  })
})

describe("isEligibleForPickupQueue", () => {
  it("includes confirmed booking at staff pickup branch without pickup handover", () => {
    expect(
      isEligibleForPickupQueue({
        status: "confirmed",
        pickupBranchId: BRANCH_A,
        staffBranchId: BRANCH_A,
        hasPickupHandover: false,
      }),
    ).toBe(true)
  })

  it("excludes one-way booking from dropoff branch queue", () => {
    expect(
      isEligibleForPickupQueue({
        status: "confirmed",
        pickupBranchId: BRANCH_A,
        staffBranchId: BRANCH_B,
        hasPickupHandover: false,
      }),
    ).toBe(false)
  })

  it("excludes when pickup handover already exists", () => {
    expect(
      isEligibleForPickupQueue({
        status: "confirmed",
        pickupBranchId: BRANCH_A,
        staffBranchId: BRANCH_A,
        hasPickupHandover: true,
      }),
    ).toBe(false)
  })

  it("excludes non-confirmed status", () => {
    expect(
      isEligibleForPickupQueue({
        status: "active",
        pickupBranchId: BRANCH_A,
        staffBranchId: BRANCH_A,
        hasPickupHandover: false,
      }),
    ).toBe(false)
  })
})

describe("isEligibleForReturnQueue", () => {
  it("includes active booking at dropoff branch after pickup", () => {
    expect(
      isEligibleForReturnQueue({
        status: "active",
        dropoffBranchId: BRANCH_B,
        staffBranchId: BRANCH_B,
        hasPickupHandover: true,
        hasReturnHandover: false,
      }),
    ).toBe(true)
  })

  it("excludes pickup branch staff on one-way (return is at B only)", () => {
    expect(
      isEligibleForReturnQueue({
        status: "active",
        dropoffBranchId: BRANCH_B,
        staffBranchId: BRANCH_A,
        hasPickupHandover: true,
        hasReturnHandover: false,
      }),
    ).toBe(false)
  })

  it("excludes without pickup handover", () => {
    expect(
      isEligibleForReturnQueue({
        status: "active",
        dropoffBranchId: BRANCH_B,
        staffBranchId: BRANCH_B,
        hasPickupHandover: false,
        hasReturnHandover: false,
      }),
    ).toBe(false)
  })

  it("excludes when return handover already exists", () => {
    expect(
      isEligibleForReturnQueue({
        status: "active",
        dropoffBranchId: BRANCH_B,
        staffBranchId: BRANCH_B,
        hasPickupHandover: true,
        hasReturnHandover: true,
      }),
    ).toBe(false)
  })
})
