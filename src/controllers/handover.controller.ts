import { NextFunction, Request, Response } from "express"
import { handoverService } from "../services/handover.service"
import { parsePositiveIntParam } from "../utils/parse-id"
import { pickupHandoverSchema, returnHandoverSchema } from "../types/dto/handover.dto"
import { createError } from "../utils/error"

// GET /api/branch/me
async function getBranchMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await handoverService.getBranchInfo(req.user!)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// GET /api/branch/queues/pickup
async function getPickupQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined
    const data = await handoverService.getPickupQueue(req.user!, search)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// GET /api/branch/queues/return
async function getReturnQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined
    const data = await handoverService.getReturnQueue(req.user!, search)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// GET /api/branch/bookings/:id
async function getBookingDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = parsePositiveIntParam(req.params.id, "id")
    const data = await handoverService.getBookingDetail(bookingId, req.user!)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// POST /api/branch/bookings/:id/pickup
async function submitPickup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = parsePositiveIntParam(req.params.id, "id")
    const parsed = pickupHandoverSchema.safeParse(req.body)
    if (!parsed.success) {
      throw createError(parsed.error.issues[0]?.message ?? "Invalid request body", 400)
    }
    const data = await handoverService.submitPickup(bookingId, parsed.data, req.user!)
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// POST /api/branch/bookings/:id/return
async function submitReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = parsePositiveIntParam(req.params.id, "id")
    const parsed = returnHandoverSchema.safeParse(req.body)
    if (!parsed.success) {
      throw createError(parsed.error.issues[0]?.message ?? "Invalid request body", 400)
    }
    const data = await handoverService.submitReturn(bookingId, parsed.data, req.user!)
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const handoverController = {
  getBranchMe,
  getPickupQueue,
  getReturnQueue,
  getBookingDetail,
  submitPickup,
  submitReturn,
}
