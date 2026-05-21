import { z } from "zod"

/** GET /api/admin/dashboard query */
export const dashboardQuerySchema = z
  .object({
    period: z.enum(["7", "30"]).optional(),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD")
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD")
      .optional(),
    chartCurrency: z
      .string()
      .trim()
      .length(3, "chartCurrency must be a 3-letter code")
      .optional(),
  })
  .refine(
    (data) => {
      const hasFrom = !!data.from
      const hasTo = !!data.to
      if (hasFrom || hasTo) return hasFrom && hasTo
      return true
    },
    { message: "Both from and to are required for a custom date range" },
  )

export type DashboardQueryDto = z.infer<typeof dashboardQuerySchema>
