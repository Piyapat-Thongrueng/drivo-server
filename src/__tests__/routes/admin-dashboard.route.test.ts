import http from "http"
import express from "express"

// mock auth/role ก่อน import route — ทดสอบเฉพาะ dashboard endpoint
jest.mock("../../middlewares/auth.middleware", () => ({
  authMiddleware: (
    req: { user?: unknown },
    _res: unknown,
    next: () => void,
  ) => {
    req.user = { id: 1, role: "super_admin", branchId: null }
    next()
  },
}))

jest.mock("../../services/report.service", () => ({
  reportService: {
    getDashboard: jest.fn(),
  },
}))

import adminRouter from "../../routes/admin.routes"
import { reportService } from "../../services/report.service"

const mockGetDashboard = reportService.getDashboard as jest.Mock

const samplePayload = {
  stats: {
    bookingsToday: 4,
    bookingsTodayDelta: 1,
    pendingApproval: 2,
    activeRentals: 1,
    completedToday: 0,
  },
  revenue: {
    range: { from: "2026-05-01", to: "2026-05-21" },
    byCurrency: [
      {
        currency: "THB",
        rental: "100.00",
        deposit: "50.00",
        damage: "10.00",
        total: "110.00",
      },
    ],
  },
  revenueChart: {
    days: ["2026-05-01"],
    series: [{ currency: "THB", points: [110] }],
  },
  revenueBreakdown: [],
  recentBookings: [],
  fleetByBranch: [],
}

function createApp() {
  const app = express()
  app.use(express.json())
  app.use("/api/admin", adminRouter)
  return app
}

function httpGet(
  app: express.Express,
  path: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address()
      const port =
        typeof addr === "object" && addr !== null ? addr.port : 0
      http
        .get(`http://127.0.0.1:${port}${path}`, (res) => {
          let raw = ""
          res.on("data", (chunk) => {
            raw += chunk
          })
          res.on("end", () => {
            server.close()
            resolve({
              status: res.statusCode ?? 0,
              body: JSON.parse(raw || "{}") as Record<string, unknown>,
            })
          })
        })
        .on("error", (err) => {
          server.close()
          reject(err)
        })
    })
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetDashboard.mockResolvedValue(samplePayload)
})

describe("GET /api/admin/dashboard", () => {
  it("returns 200 and dashboard payload when query is valid", async () => {
    const app = createApp()
    const { status, body } = await httpGet(
      app,
      "/api/admin/dashboard?period=30",
    )

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual(samplePayload)
    expect(mockGetDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ period: "30" }),
    )
  })

  it("returns 400 when custom range is incomplete", async () => {
    const app = createApp()
    const { status, body } = await httpGet(
      app,
      "/api/admin/dashboard?from=2026-05-01",
    )

    expect(status).toBe(400)
    expect(body.success).toBe(false)
    expect(mockGetDashboard).not.toHaveBeenCalled()
  })

  it("returns 400 for invalid period enum", async () => {
    const app = createApp()
    const { status, body } = await httpGet(
      app,
      "/api/admin/dashboard?period=99",
    )

    expect(status).toBe(400)
    expect(body.success).toBe(false)
    expect(mockGetDashboard).not.toHaveBeenCalled()
  })
})
