import { carAddonRepository } from "../repositories/car-addon.repository";
import { carRepository } from "../repositories/car.repository";
import { CreateCarAddonDto, UpdateCarAddonDto } from "../types/dto/car-addon.dto";
import { createError } from "../utils/error";
import type { AuthenticatedUser } from "../types";

async function listAddons(carId: number, user?: AuthenticatedUser) {
  const car = await carRepository.findById(carId);

  if (!car) {
    throw createError("Car not found", 404);
  }

  // super_admin เห็นทุก addon (รวมที่ปิดชั่วคราว) — สำหรับหน้า Edit Car
  // user / guest เห็นเฉพาะที่ isAvailable = true — สำหรับหน้า booking
  const onlyAvailable = user?.role !== "super_admin";

  return carAddonRepository.findAllByCarId(carId, onlyAvailable);
}

async function createAddon(carId: number, data: CreateCarAddonDto) {
  const car = await carRepository.findById(carId);

  if (!car) {
    throw createError("Car not found", 404);
  }

  return carAddonRepository.create(carId, data);
}

async function updateAddon(carId: number, addonId: number, data: UpdateCarAddonDto) {
  const car = await carRepository.findById(carId);

  if (!car) {
    throw createError("Car not found", 404);
  }

  const addon = await carAddonRepository.findByIdAndCarId(addonId, carId);

  if (!addon) {
    throw createError("Addon not found for this car", 404);
  }

  const updated = await carAddonRepository.updateById(addonId, carId, data);

  if (!updated) {
    throw createError("Addon not found for this car", 404);
  }

  return updated;
}

async function deleteAddon(carId: number, addonId: number) {
  const car = await carRepository.findById(carId);

  if (!car) {
    throw createError("Car not found", 404);
  }

  const addon = await carAddonRepository.findByIdAndCarId(addonId, carId);

  if (!addon) {
    throw createError("Addon not found for this car", 404);
  }

  await carAddonRepository.deleteById(addonId, carId);
}

export const carAddonService = {
  listAddons,
  createAddon,
  updateAddon,
  deleteAddon,
};
