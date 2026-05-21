import { NextFunction, Request, Response } from "express"
import { reportService } from "../services/report.service"
import type { DashboardQueryDto } from "../types/dto/report.dto"

/** GET /api/admin/dashboard */
async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await reportService.getDashboard(
      req.query as DashboardQueryDto,
    )
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const reportController = {
  getDashboard,
}
