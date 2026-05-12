import { Request, Response, NextFunction } from "express"
import type { ZodType } from "zod"

// Generic middleware factory ที่รับ Zod schema แล้ว validate req.body
// Zod 4: ใช้ ZodType แทน ZodSchema (ZodSchema เป็น alias ที่ deprecated)
export function validate<T extends ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.error.issues[0].message,
      })
      return
    }

    // ใช้ข้อมูลที่ผ่าน Zod transform/coerce แล้ว แทนที่ raw body เดิม
    req.body = result.data
    next()
  }
}
