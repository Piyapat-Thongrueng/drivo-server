import { NextFunction, Request, Response } from "express"
import { bookingService } from "../services/booking.service"
import type {
  CreateBookingDto,
  ListBookingsQueryDto,
  RejectBookingDto,
} from "../types/dto/booking.dto"

// POST /api/bookings
async function createBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const booking = await bookingService.createBooking(
      req.body as CreateBookingDto,
      req.user!,
    )
    res.status(201).json({ success: true, data: booking })
  } catch (error) {
    next(error)
  }
}

// GET /api/bookings
async function listMyBookings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookings = await bookingService.listMyBookings(req.user!)
    res.json({ success: true, data: bookings })
  } catch (error) {
    next(error)
  }
}

// GET /api/bookings/:id
async function getBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id)
    const booking = await bookingService.getBooking(id, req.user!)
    res.json({ success: true, data: booking })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/bookings/:id/cancel
async function cancelBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id)
    const booking = await bookingService.cancelBooking(id, req.user!)
    res.json({ success: true, data: booking })
  } catch (error) {
    next(error)
  }
}

// GET /api/admin/bookings
async function listAllBookings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListBookingsQueryDto
    const bookings = await bookingService.listAllBookings(query)
    res.json({ success: true, data: bookings })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/admin/bookings/:id/approve
async function approveBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id)
    const booking = await bookingService.approveBooking(id, req.user!)
    res.json({ success: true, data: booking })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/admin/bookings/:id/reject
async function rejectBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id)
    const booking = await bookingService.rejectBooking(
      id,
      req.body as RejectBookingDto,
      req.user!,
    )
    res.json({ success: true, data: booking })
  } catch (error) {
    next(error)
  }
}

export const bookingController = {
  createBooking,
  listMyBookings,
  getBooking,
  cancelBooking,
  listAllBookings,
  approveBooking,
  rejectBooking,
}
