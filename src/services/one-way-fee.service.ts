import { branchRepository } from "../repositories/branch.repository";
import { oneWayFeeRepository } from "../repositories/one-way-fee.repository";
import {
  CreateOneWayFeeDto,
  UpdateOneWayFeeDto,
} from "../types/dto/one-way-fee.dto";
import { createError } from "../utils/error";

async function listFees(fromBranchId?: number, toBranchId?: number) {
  return oneWayFeeRepository.findAll(fromBranchId, toBranchId);
}

async function setFee(data: CreateOneWayFeeDto) {
  // ห้ามเลือก branch เดียวกันทั้งต้นทางและปลายทาง
  if (data.fromBranchId === data.toBranchId) {
    throw createError("From and To branches cannot be the same", 422);
  }

  // ตรวจว่า branch ต้นทางมีอยู่จริง
  const fromBranch = await branchRepository.findById(data.fromBranchId);
  if (!fromBranch) {
    throw createError(`From branch (id: ${data.fromBranchId}) not found`, 404);
  }

  // ตรวจว่า branch ปลายทางมีอยู่จริง
  const toBranch = await branchRepository.findById(data.toBranchId);
  if (!toBranch) {
    throw createError(`To branch (id: ${data.toBranchId}) not found`, 404);
  }

  // ตรวจว่าคู่นี้มีอยู่แล้วหรือยัง
  const existing = await oneWayFeeRepository.findByPair(
    data.fromBranchId,
    data.toBranchId,
  );
  if (existing) {
    throw createError(
      `One-way fee from branch ${data.fromBranchId} to branch ${data.toBranchId} already exists. Use PATCH to update it.`,
      409,
    );
  }

  // สร้าง fee ทิศทางหลัก
  const fee = await oneWayFeeRepository.create({
    fromBranchId: data.fromBranchId,
    toBranchId: data.toBranchId,
    fee: String(data.fee),
  });

  // สร้างทิศทางกลับอัตโนมัติ (ถ้ายังไม่มี) โดย default fee = 0
  const reverseExists = await oneWayFeeRepository.findByPair(
    data.toBranchId,
    data.fromBranchId,
  );
  if (!reverseExists) {
    await oneWayFeeRepository.create({
      fromBranchId: data.toBranchId,
      toBranchId: data.fromBranchId,
      fee: "0",
    });
  }

  return fee;
}

async function updateFee(id: number, data: UpdateOneWayFeeDto) {
  const fee = await oneWayFeeRepository.findById(id);

  if (!fee) {
    throw createError("One-way fee not found", 404);
  }

  return oneWayFeeRepository.updateById(id, data);
}

export const oneWayFeeService = {
  listFees,
  setFee,
  updateFee,
};
