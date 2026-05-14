import { NextFunction, Request, Response } from "express";
import { branchService } from "../services/branch.service";
import { CreateBranchDto, UpdateBranchDto } from "../types/dto/branch.dto";

// GET /api/branches?countryId=1
async function listBranches(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const countryId = req.query.countryId
      ? Number(req.query.countryId)
      : undefined;
    const branches = await branchService.listBranches(countryId);

    res.json({ success: true, data: branches });
  } catch (error) {
    next(error);
  }
}

// GET /api/branches/:id
async function getBranch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const branch = await branchService.getBranch(id);

    res.json({ success: true, data: branch });
  } catch (error) {
    next(error);
  }
}

// POST /api/branches
async function createBranch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as CreateBranchDto;
    const branch = await branchService.createBranch(data);

    res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/branches/:id
async function updateBranch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const data = req.body as UpdateBranchDto;
    const branch = await branchService.updateBranch(id, data);

    res.json({
      success: true,
      message: "Branch updated successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/branches/:id
async function deleteBranch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    await branchService.deleteBranch(id);

    res.json({ success: true, message: "Branch deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export const branchController = {
  listBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
};
