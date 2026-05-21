import { DASHBOARD_TIMEZONE } from "../config/dashboard.constants"
import { reportRepository } from "../repositories/report.repository"
import type { DashboardQueryDto } from "../types/dto/report.dto"
import { buildDailySeries } from "../utils/dashboard-aggregates"
import {
  getTodayRange,
  getYesterdayRange,
  listDaysInRange,
  resolveDashboardRange,
  toRangeLabels,
} from "../utils/dashboard-dates"
import { createError } from "../utils/error"

export interface DashboardResponse {
  stats: Awaited<ReturnType<typeof reportRepository.getStatCounts>>
  revenue: {
    range: { from: string; to: string }
    byCurrency: Awaited<ReturnType<typeof reportRepository.getRevenueByCurrency>>
  }
  revenueChart: {
    days: string[]
    series: Array<{ currency: string; points: number[] }>
  }
  revenueBreakdown: Awaited<
    ReturnType<typeof reportRepository.getRevenueBreakdownByBranch>
  >
  recentBookings: Awaited<ReturnType<typeof reportRepository.getRecentBookings>>
  fleetByBranch: Awaited<ReturnType<typeof reportRepository.getFleetByBranch>>
}

/**
 * รวมข้อมูล dashboard ทุก section ในครั้งเดียว
 * ช่วงรายได้/กราฟใช้ period หรือ from+to; stat cards ใช้ "วันนี้" ใน Bangkok เสมอ
 */
async function getDashboard(query: DashboardQueryDto): Promise<DashboardResponse> {
  const tz = DASHBOARD_TIMEZONE

  let range
  try {
    range = resolveDashboardRange(
      {
        period: query.period,
        from: query.from,
        to: query.to,
      },
      tz,
    )
  } catch {
    throw createError("Invalid date range", 400)
  }

  const todayRange = getTodayRange(tz)
  const yesterdayRange = getYesterdayRange(tz)

  const [
    stats,
    byCurrency,
    dailyBuckets,
    revenueBreakdown,
    recentBookings,
    fleetByBranch,
  ] = await Promise.all([
    reportRepository.getStatCounts(todayRange, yesterdayRange),
    reportRepository.getRevenueByCurrency(range),
    reportRepository.getRevenueDailyBuckets(range, tz),
    reportRepository.getRevenueBreakdownByBranch(range),
    reportRepository.getRecentBookings(10),
    reportRepository.getFleetByBranch(),
  ])

  const days = listDaysInRange(range, tz)
  const series = buildDailySeries(
    days,
    dailyBuckets,
    query.chartCurrency,
  )

  return {
    stats,
    revenue: {
      range: toRangeLabels(range, tz),
      byCurrency,
    },
    revenueChart: { days, series },
    revenueBreakdown,
    recentBookings,
    fleetByBranch,
  }
}

export const reportService = {
  getDashboard,
}
