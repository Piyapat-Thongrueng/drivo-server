import { z } from "zod"

export const createCountrySchema = z.object({
  name: z.string().min(1, "Country name is required"),
  code: z
    .string()
    .length(2, "Country code must be exactly 2 characters")
    .transform((s) => s.toUpperCase()),
  currencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters")
    .transform((s) => s.toUpperCase()),
  timezone: z.string().min(1, "Timezone is required"),
  isActive: z.boolean().default(true),
  defaultDepositAmount: z
    .number()
    .positive("Default deposit amount must be greater than 0"),
})

export const updateCountrySchema = z.object({
  name: z.string().min(1, "Country name is required").optional(),
  code: z
    .string()
    .length(2, "Country code must be exactly 2 characters")
    .transform((s) => s.toUpperCase())
    .optional(),
  currencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters")
    .transform((s) => s.toUpperCase())
    .optional(),
  timezone: z.string().min(1, "Timezone is required").optional(),
  isActive: z.boolean().optional(),
  defaultDepositAmount: z
    .number()
    .positive("Default deposit amount must be greater than 0")
    .optional(),
})

export type CreateCountryDto = z.infer<typeof createCountrySchema>
export type UpdateCountryDto = z.infer<typeof updateCountrySchema>
