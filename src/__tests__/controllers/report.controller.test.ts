import { Request, Response, NextFunction } from "express"
import { reportController } from "../../controllers/report.controller"

jest.mock("../../services/report.service", () => ({
  reportService: {
    getDashboard: jest.fn(),
  },
}))

import { reportService } from "../../services/report.service"

const mockService = reportService as jest.Mocked<typeof reportService>

const mockRes = () => {
  const res = {} as Response
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const fakeDashboard = {
  stats: {
    bookingsToday: 1,
    bookingsTodayDelta: 0,
    pendingApproval: 2,
    activeRentals: 3,
    completedToday: 0,
  },
  revenue: {
    range: { from: "2026-05-01", to: "2026-05-21" },
    byCurrency: [],
  },
  revenueChart: { days: ["2026-05-01"], series: [] },
  revenueBreakdown: [],
  recentBookings: [],
  fleetByBranch: [],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockService.getDashboard.mockResolvedValue(fakeDashboard)
})

describe("reportController.getDashboard", () => {
  it("returns 200 with success wrapper", async () => {
    const req = { query: { period: "30" } } as unknown as Request
    const res = mockRes()
    const next = jest.fn() as NextFunction

    await reportController.getDashboard(req, res, next)

    expect(mockService.getDashboard).toHaveBeenCalledWith({ period: "30" })
    expect(res.json).toHaveBeenCalledWith({ success: true, data: fakeDashboard })
    expect(next).not.toHaveBeenCalled()
  })

  it("forwards errors to next", async () => {
    const err = new Error("DB down")
    mockService.getDashboard.mockRejectedValue(err)
    const req = { query: {} } as unknown as Request
    const res = mockRes()
    const next = jest.fn() as NextFunction

    await reportController.getDashboard(req, res, next)

    expect(next).toHaveBeenCalledWith(err)
    expect(res.json).not.toHaveBeenCalled()
  })
})
