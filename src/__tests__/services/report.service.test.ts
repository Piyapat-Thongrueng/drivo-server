import { reportService } from "../../services/report.service"

jest.mock("../../repositories/report.repository", () => ({
  reportRepository: {
    getStatCounts: jest.fn(),
    getRevenueByCurrency: jest.fn(),
    getRevenueDailyBuckets: jest.fn(),
    getRevenueBreakdownByBranch: jest.fn(),
    getRecentBookings: jest.fn(),
    getFleetByBranch: jest.fn(),
  },
}))

import { reportRepository } from "../../repositories/report.repository"

const mockRepo = reportRepository as jest.Mocked<typeof reportRepository>

const fakeStats = {
  bookingsToday: 5,
  bookingsTodayDelta: 2,
  pendingApproval: 3,
  activeRentals: 4,
  completedToday: 1,
}

const fakeRevenueRow = {
  currency: "THB",
  rental: "1000.00",
  deposit: "200.00",
  damage: "50.00",
  total: "1050.00",
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRepo.getStatCounts.mockResolvedValue(fakeStats)
  mockRepo.getRevenueByCurrency.mockResolvedValue([fakeRevenueRow])
  mockRepo.getRevenueDailyBuckets.mockResolvedValue([
    { day: "2026-05-01", currency: "THB", rental: "100", damage: "0" },
  ])
  mockRepo.getRevenueBreakdownByBranch.mockResolvedValue([])
  mockRepo.getRecentBookings.mockResolvedValue([])
  mockRepo.getFleetByBranch.mockResolvedValue([])
})

describe("reportService.getDashboard", () => {
  it("returns all dashboard sections", async () => {
    const result = await reportService.getDashboard({})

    expect(mockRepo.getStatCounts).toHaveBeenCalledTimes(1)
    expect(mockRepo.getRevenueByCurrency).toHaveBeenCalledTimes(1)
    expect(mockRepo.getRevenueDailyBuckets).toHaveBeenCalledTimes(1)
    expect(mockRepo.getRecentBookings).toHaveBeenCalledWith(10)

    expect(result.stats).toEqual(fakeStats)
    expect(result.revenue.byCurrency).toEqual([fakeRevenueRow])
    expect(result.revenue.range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.revenueChart.days.length).toBeGreaterThan(0)
    expect(result.revenueChart.series.length).toBeGreaterThanOrEqual(0)
    expect(result.recentBookings).toEqual([])
    expect(result.fleetByBranch).toEqual([])
  })

  it("uses period=7 for revenue range span", async () => {
    await reportService.getDashboard({ period: "7" })

    const rangeArg = mockRepo.getRevenueByCurrency.mock.calls[0][0]
    const days =
      (new Date(rangeArg.to).getTime() - new Date(rangeArg.from).getTime()) /
      (1000 * 60 * 60 * 24)
    expect(days).toBeGreaterThanOrEqual(6)
    expect(days).toBeLessThanOrEqual(8)
  })

  it("uses custom from/to when provided", async () => {
    await reportService.getDashboard({
      from: "2026-05-01",
      to: "2026-05-03",
    })

    expect(mockRepo.getRevenueByCurrency).toHaveBeenCalled()
    const result = await reportService.getDashboard({
      from: "2026-05-01",
      to: "2026-05-03",
    })
    expect(result.revenue.range).toEqual({ from: "2026-05-01", to: "2026-05-03" })
    expect(result.revenueChart.days).toEqual([
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
    ])
  })

  it("filters chart series by chartCurrency", async () => {
    mockRepo.getRevenueDailyBuckets.mockResolvedValue([
      { day: "2026-05-01", currency: "THB", rental: "10", damage: "0" },
      { day: "2026-05-01", currency: "GBP", rental: "5", damage: "0" },
    ])

    const result = await reportService.getDashboard({
      from: "2026-05-01",
      to: "2026-05-01",
      chartCurrency: "THB",
    })

    expect(result.revenueChart.series).toHaveLength(1)
    expect(result.revenueChart.series[0].currency).toBe("THB")
  })

  it("throws 400 for invalid custom range", async () => {
    await expect(
      reportService.getDashboard({
        from: "2026-05-10",
        to: "2026-05-01",
      }),
    ).rejects.toMatchObject({ statusCode: 400, isAppError: true })
  })
})
