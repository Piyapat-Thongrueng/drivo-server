import { z } from "zod"

export const createBranchSchema = z.object({
  countryId: z.number().int().positive("Country ID must be a positive integer"),
  name: z.string().min(1, "Branch name is required"),
  address: z.string().min(1, "Address is required"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  openingTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Opening time must be in HH:MM format")
    .optional()
    .nullable(),
  closingTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Closing time must be in HH:MM format")
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
})

export const updateBranchSchema = z.object({
  name: z.string().min(1, "Branch name is required").optional(),
  address: z.string().min(1, "Address is required").optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  openingTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Opening time must be in HH:MM format")
    .optional()
    .nullable(),
  closingTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Closing time must be in HH:MM format")
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
})

export type CreateBranchDto = z.infer<typeof createBranchSchema>
export type UpdateBranchDto = z.infer<typeof updateBranchSchema>
