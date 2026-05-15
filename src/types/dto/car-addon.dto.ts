import { z } from "zod";

export const createCarAddonSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z
    .string()
    .min(1, "Description is required")
    .max(300, "Description must be at most 300 characters"),
  pricePerDay: z.number().positive("Price per day must be greater than 0"),
  isAvailable: z.boolean().optional().default(true),
});

export const updateCarAddonSchema = createCarAddonSchema.partial();

export type CreateCarAddonDto = z.infer<typeof createCarAddonSchema>;
export type UpdateCarAddonDto = z.infer<typeof updateCarAddonSchema>;
