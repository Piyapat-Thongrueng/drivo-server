import { z } from "zod"

const fuelLevelEnum = z.enum(["full", "three_quarters", "half", "quarter", "empty"])

const photoSchema = z.object({
  angle: z.enum(["front", "back", "left", "right"]),
  storagePath: z.string().min(1),
  url: z.string().url(),
})

// ─── Pickup ───────────────────────────────────────────────────────────────────

export const pickupHandoverSchema = z
  .object({
    fuelLevel: fuelLevelEnum,
    photos: z
      .array(photoSchema)
      .length(4, "Exactly 4 photos required (front, back, left, right)"),
  })
  .superRefine((data, ctx) => {
    const angles = data.photos.map((p) => p.angle)
    const unique = new Set(angles)
    if (unique.size !== 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each photo must have a unique angle: front, back, left, right",
        path: ["photos"],
      })
    }
  })

export type PickupHandoverDto = z.infer<typeof pickupHandoverSchema>

// ─── Return ───────────────────────────────────────────────────────────────────

export const returnHandoverSchema = z
  .object({
    fuelLevel: fuelLevelEnum,
    extraCharge: z
      .number()
      .nonnegative("extraCharge cannot be negative")
      .finite(),
    photos: z
      .array(photoSchema)
      .length(4, "Exactly 4 photos required (front, back, left, right)"),
  })
  .superRefine((data, ctx) => {
    const angles = data.photos.map((p) => p.angle)
    const unique = new Set(angles)
    if (unique.size !== 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each photo must have a unique angle: front, back, left, right",
        path: ["photos"],
      })
    }
  })

export type ReturnHandoverDto = z.infer<typeof returnHandoverSchema>
