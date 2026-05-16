import { z } from "zod"

export const pricingPreviewSchema = z.object({
  carId: z.coerce.number().int().positive(),
  pickupBranchId: z.coerce.number().int().positive(),
  dropoffBranchId: z.coerce.number().int().positive(),
  pickupDatetime: z.string().datetime({ offset: true }),
  dropoffDatetime: z.string().datetime({ offset: true }),
  addonIds: z.array(z.number().int().positive()).optional().default([]),
})

export type PricingPreviewDto = z.infer<typeof pricingPreviewSchema>
