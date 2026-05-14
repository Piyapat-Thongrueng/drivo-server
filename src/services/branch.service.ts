import { branchRepository } from "../repositories/branch.repository";
import { countryRepository } from "../repositories/country.repository";
import { oneWayFeeRepository } from "../repositories/one-way-fee.repository";
import { CreateBranchDto, UpdateBranchDto } from "../types/dto/branch.dto";
import { createError } from "../utils/error";

async function listBranches(countryId?: number) {
  return branchRepository.findAll(countryId);
}

async function getBranch(id: number) {
  const branch = await branchRepository.findById(id);

  if (!branch) {
    throw createError("Branch not found", 404);
  }

  return branch;
}

async function createBranch(data: CreateBranchDto) {
  // ตรวจว่า country มีอยู่จริง
  const country = await countryRepository.findById(data.countryId);

  if (!country) {
    throw createError("Country not found", 404);
  }

  // ตรวจว่า country เปิดให้บริการ — ห้ามเพิ่ม branch ให้ประเทศที่ปิดอยู่
  if (!country.isActive) {
    throw createError(
      `Cannot add a branch to '${country.name}' because the country is inactive.`,
      422,
    );
  }

  return branchRepository.create(data);
}

async function updateBranch(id: number, data: UpdateBranchDto) {
  const branch = await branchRepository.findById(id);

  if (!branch) {
    throw createError("Branch not found", 404);
  }

  return branchRepository.updateById(id, data);
}

async function deleteBranch(id: number) {
  const branch = await branchRepository.findById(id);

  if (!branch) {
    throw createError("Branch not found", 404);
  }

  // ตรวจว่ามีรถอยู่ที่ branch นี้ไหม
  const hasCars = await branchRepository.hasCars(id);

  if (hasCars) {
    throw createError(
      "Cannot delete a branch that has cars. Please move all cars out first.",
      409,
    );
  }

  // ตรวจว่ามี booking ที่ยังไม่จบอยู่ไหม
  const hasBookings = await branchRepository.hasActiveBookings(id);

  if (hasBookings) {
    throw createError("Cannot delete a branch that has active bookings.", 409);
  }

  // ลบ one-way fees ที่อ้างอิง branch นี้ก่อน (ป้องกัน FK constraint violation)
  await oneWayFeeRepository.deleteByBranchId(id);

  await branchRepository.deleteById(id);
}

export const branchService = {
  listBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
};
