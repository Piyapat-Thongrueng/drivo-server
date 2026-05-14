import { carRepository } from "../repositories/car.repository";
import { branchRepository } from "../repositories/branch.repository";
import { AvailableQueryDto, CreateCarDto, UpdateCarDto } from "../types/dto/car.dto";
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

// GET /api/cars/:id
async function getCar(id: number) {
  const car = await carRepository.findById(id);

  if (!car) {
    throw createError("Car not found", 404);
  }

  return car;
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
  getAvailableCars,
  getCar,
  createCar,
  updateCar,
  deleteCar,
};
