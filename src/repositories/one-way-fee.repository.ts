import { and, eq, or } from "drizzle-orm";
import { db } from "../db";
import { oneWayFees } from "../db/schema";
import { UpdateOneWayFeeDto } from "../types/dto/one-way-fee.dto";

async function findAll(fromBranchId?: number, toBranchId?: number) {
  if (fromBranchId && toBranchId) {
    return db
      .select()
      .from(oneWayFees)
      .where(
        and(
          eq(oneWayFees.fromBranchId, fromBranchId),
          eq(oneWayFees.toBranchId, toBranchId),
        ),
      );
  }
  if (fromBranchId) {
    return db
      .select()
      .from(oneWayFees)
      .where(eq(oneWayFees.fromBranchId, fromBranchId));
  }
  if (toBranchId) {
    return db
      .select()
      .from(oneWayFees)
      .where(eq(oneWayFees.toBranchId, toBranchId));
  }
  return db.select().from(oneWayFees);
}

async function findById(id: number) {
  const result = await db
    .select()
    .from(oneWayFees)
    .where(eq(oneWayFees.id, BigInt(id)))
    .limit(1);

  return result[0] ?? null;
}

async function findByPair(fromBranchId: number, toBranchId: number) {
  const result = await db
    .select()
    .from(oneWayFees)
    .where(
      and(
        eq(oneWayFees.fromBranchId, fromBranchId),
        eq(oneWayFees.toBranchId, toBranchId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

async function create(data: {
  fromBranchId: number;
  toBranchId: number;
  fee: string;
}) {
  const result = await db.insert(oneWayFees).values(data).returning();
  return result[0];
}

async function updateById(id: number, data: UpdateOneWayFeeDto) {
  const result = await db
    .update(oneWayFees)
    .set({ fee: String(data.fee), updatedAt: new Date().toISOString() })
    .where(eq(oneWayFees.id, BigInt(id)))
    .returning();

  return result[0] ?? null;
}

// ลบ one-way fees ทั้งหมดที่เกี่ยวข้องกับ branch นั้น (ทั้ง from และ to)
async function deleteByBranchId(branchId: number) {
  await db
    .delete(oneWayFees)
    .where(
      or(
        eq(oneWayFees.fromBranchId, branchId),
        eq(oneWayFees.toBranchId, branchId),
      ),
    );
}

export const oneWayFeeRepository = {
  findAll,
  findById,
  findByPair,
  create,
  updateById,
  deleteByBranchId,
};
