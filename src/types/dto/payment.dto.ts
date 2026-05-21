import { z } from "zod"

// ─── Checkout Session ─────────────────────────────────────────────────────────

// ลูกค้าต้องส่ง URL ที่ Stripe จะ redirect กลับเมื่อชำระเสร็จหรือกดยกเลิก
export const createCheckoutSessionSchema = z.object({
  successUrl: z.string().url("must be a valid URL"),
  cancelUrl: z.string().url("must be a valid URL"),
})

export type CreateCheckoutSessionDto = z.infer<typeof createCheckoutSessionSchema>
