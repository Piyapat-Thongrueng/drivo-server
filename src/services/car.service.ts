import { carRepository } from "../repositories/car.repository";
import { branchRepository } from "../repositories/branch.repository";
import {
  AvailableQueryDto,
  CreateCarDto,
  FleetQueryDto,
  UpdateCarDto,
} from "../types/dto/car.dto";
import { createError } from "../utils/error";

// GET /api/cars — admin ดูทั้งหมด
async function listCars(branchId?: number) {
  return carRepository.findAll(branchId);
}

// GET /api/cars/available — user ใช้ตอนค้นหา
async function getAvailableCars(query: AvailableQueryDto) {
  return carRepository.findAvailable(
    query.pickupBranchId,
    query.pickupDatetime,
    query.dropoffDatetime,
  );
}

// GET /api/cars/fleet — รายการรถทั้งหมดแยกตามประเทศ (public)
async function getFleet(query: FleetQueryDto) {
  return carRepository.findFleet(query.countryId);
}

// GET /api/cars/:id — แนบ hasActiveBooking ให้หน้าแอดมินเช็กก่อนสลับเป็น maintenance
async function getCar(id: number) {
  const car = await carRepository.findById(id);

  if (!car) {
    throw createError("Car not found", 404);
  }

  const hasActiveBooking = await carRepository.hasActiveBookings(id);

  return { ...car, hasActiveBooking };
}

// POST /api/cars
async function createCar(data: CreateCarDto) {
  // ตรวจว่า branch มีอยู่จริง
  const branch = await branchRepository.findById(data.branchId);

  if (!branch) {
    throw createError("Branch not found", 404);
  }

  // ตรวจว่า licensePlate ซ้ำไหม
  const existing = await carRepository.findByLicensePlate(data.licensePlate);

  if (existing) {
    throw createError(
      `License plate '${data.licensePlate}' is already registered.`,
      409,
    );
  }

  return carRepository.create(data);
}

// PATCH /api/cars/:id
async function updateCar(id: number, data: UpdateCarDto) {
  const car = await carRepository.findById(id);

  if (!car) {
    throw createError("Car not found", 404);
  }

  if (data.licensePlate !== undefined && data.licensePlate !== car.licensePlate) {
    const taken = await carRepository.findByLicensePlateExcludingId(data.licensePlate, id);

    if (taken) {
      throw createError(
        `License plate '${data.licensePlate}' is already registered.`,
        409,
      );
    }
  }

  // ถ้าจะเปลี่ยนสถานะเป็น maintenance ต้องไม่มี active booking
  if (data.status === "maintenance") {
    const hasBookings = await carRepository.hasActiveBookings(id);

    if (hasBookings) {
      throw createError(
        "Cannot set car to maintenance while it has confirmed or active bookings.",
        409,
      );
    }
  }

  return carRepository.updateById(id, data);
}

// DELETE /api/cars/:id — soft delete
async function deleteCar(id: number) {
  const car = await carRepository.findById(id);

  if (!car) {
    throw createError("Car not found", 404);
  }

  // ตรวจว่ามี confirmed/active booking ไหม
  const hasBookings = await carRepository.hasActiveBookings(id);

  if (hasBookings) {
    throw createError(
      "Cannot delete a car that has confirmed or active bookings.",
      409,
    );
  }

  await carRepository.softDelete(id);
}

export const carService = {
  listCars,
  getFleet,
  getAvailableCars,
  getCar,
  createCar,
  updateCar,
  deleteCar,
};
