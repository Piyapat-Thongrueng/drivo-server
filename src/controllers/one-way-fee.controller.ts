import { NextFunction, Request, Response } from "express";
import { oneWayFeeService } from "../services/one-way-fee.service";
import {
  CreateOneWayFeeDto,
  UpdateOneWayFeeDto,
} from "../types/dto/one-way-fee.dto";

// GET /api/one-way-fees?fromBranchId=1&toBranchId=2
async function listFees(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const fromBranchId = req.query.fromBranchId
      ? Number(req.query.fromBranchId)
      : undefined;
    const toBranchId = req.query.toBranchId
      ? Number(req.query.toBranchId)
      : undefined;
    const fees = await oneWayFeeService.listFees(fromBranchId, toBranchId);

    res.json({ success: true, data: fees });
  } catch (error) {
    next(error);
  }
}

// POST /api/one-way-fees
async function setFee(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as CreateOneWayFeeDto;
    const fee = await oneWayFeeService.setFee(data);

    res.status(201).json({
      success: true,
      message: "One-way fee created successfully",
      data: fee,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/one-way-fees/:id
async function updateFee(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const data = req.body as UpdateOneWayFeeDto;
    const fee = await oneWayFeeService.updateFee(id, data);

    res.json({
      success: true,
      message: "One-way fee updated successfully",
      data: fee,
    });
  } catch (error) {
    next(error);
  }
}

export const oneWayFeeController = {
  listFees,
  setFee,
  updateFee,
};
