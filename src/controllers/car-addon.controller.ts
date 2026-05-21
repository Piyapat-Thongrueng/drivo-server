import { NextFunction, Request, Response } from "express";
import { carAddonService } from "../services/car-addon.service";
import { CreateCarAddonDto, UpdateCarAddonDto } from "../types/dto/car-addon.dto";

function parseCarId(req: Request): number {
  return Number(req.params.carId);
}

function parseAddonId(req: Request): number {
  return Number(req.params.addonId);
}

// GET /api/cars/:carId/addons
async function listAddons(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const carId = parseCarId(req);
    const addons = await carAddonService.listAddons(carId, req.user);

    res.json({ success: true, data: addons });
  } catch (error) {
    next(error);
  }
}

// POST /api/cars/:carId/addons
async function createAddon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const carId = parseCarId(req);
    const data = req.body as CreateCarAddonDto;
    const addon = await carAddonService.createAddon(carId, data);

    res.status(201).json({
      success: true,
      message: "Addon created successfully",
      data: addon,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/cars/:carId/addons/:addonId
async function updateAddon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const carId = parseCarId(req);
    const addonId = parseAddonId(req);
    const data = req.body as UpdateCarAddonDto;
    const addon = await carAddonService.updateAddon(carId, addonId, data);

    res.json({
      success: true,
      message: "Addon updated successfully",
      data: addon,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/cars/:carId/addons/:addonId
async function deleteAddon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const carId = parseCarId(req);
    const addonId = parseAddonId(req);
    await carAddonService.deleteAddon(carId, addonId);

    res.json({ success: true, message: "Addon deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export const carAddonController = {
  listAddons,
  createAddon,
  updateAddon,
  deleteAddon,
};
