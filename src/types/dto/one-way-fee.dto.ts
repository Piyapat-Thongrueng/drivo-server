import { z } from "zod"

export const createOneWayFeeSchema = z.object({
  fromBranchId: z.number().int().positive("From branch ID must be a positive integer"),
  toBranchId: z.number().int().positive("To branch ID must be a positive integer"),
  fee: z.number().min(0, "Fee cannot be negative"),
})

export const updateOneWayFeeSchema = z.object({
  fee: z.number().min(0, "Fee cannot be negative"),
})

export type CreateOneWayFeeDto = z.infer<typeof createOneWayFeeSchema>
export type UpdateOneWayFeeDto = z.infer<typeof updateOneWayFeeSchema>
