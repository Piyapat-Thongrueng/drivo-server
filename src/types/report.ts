/** Stat cards แถวบนสุดของ dashboard */
export interface DashboardStatCounts {
  bookingsToday: number
  bookingsTodayDelta: number
  pendingApproval: number
  activeRentals: number
  completedToday: number
}

/** รายได้รวมแยกสกุลเงิน */
export interface RevenueByCurrencyRow {
  currency: string
  rental: string
  deposit: string
  damage: string
  total: string
}

/** Breakdown ตามสาขา */
export interface RevenueBreakdownRow {
  country: string
  branch: string
  branchId: number
  currency: string
  bookings: number
  revenue: string
}

/** Booking ล่าสุดสำหรับตาราง */
export interface RecentBookingRow {
  id: number
  reference: string
  status: string
  customerName: string
  carLabel: string
  pickupBranchName: string
  totalAmount: string | null
  currencyCode: string
  createdAt: string
}

/** Fleet ต่อสาขา */
export interface FleetByBranchRow {
  branchId: number
  branchName: string
  total: number
  available: number
  booked: number
  maintenance: number
}

/** จุดรายได้รายวัน (ก่อนรวมเป็น chart series) */
export interface DailyRevenueBucket {
  day: string
  currency: string
  rental: string
  damage: string
}
