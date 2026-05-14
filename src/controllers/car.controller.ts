import { NextFunction, Request, Response } from "express";
import { carService } from "../services/car.service";
import { AvailableQueryDto, CreateCarDto, UpdateCarDto } from "../types/dto/car.dto";

// GET /api/cars?branchId=1
async function listCars(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    const cars = await carService.listCars(branchId);

    res.json({ success: true, data: cars });
  } catch (error) {
    next(error);
  }
}

// GET /api/cars/available?pickupBranchId=1&pickupDatetime=...&dropoffDatetime=...
async function getAvailableCars(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as AvailableQueryDto;
    const cars = await carService.getAvailableCars(query);

    res.json({ success: true, data: cars });
  } catch (error) {
    next(error);
  }
}

// GET /api/cars/:id
async function getCar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const car = await carService.getCar(id);

    res.json({ success: true, data: car });
  } catch (error) {
    next(error);
  }
}

// POST /api/cars
async function createCar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreateCarDto;
    const car = await carService.createCar(data);

    res.status(201).json({
      success: true,
      message: "Car created successfully",
      data: car,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/cars/:id
async function updateCar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const data = req.body as UpdateCarDto;
    const car = await carService.updateCar(id, data);

    res.json({
      success: true,
      message: "Car updated successfully",
      data: car,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/cars/:id
async function deleteCar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    await carService.deleteCar(id);

    res.json({ success: true, message: "Car deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export const carController = {
  listCars,
  getAvailableCars,
  getCar,
  createCar,
  updateCar,
  deleteCar,
};
