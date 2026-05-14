import { Request, Response, NextFunction } from "express"
import type { ZodType } from "zod"

type ValidateSource = "body" | "query"

// Generic middleware factory ที่รับ Zod schema แล้ว validate req.body หรือ req.query
// Zod 4: ใช้ ZodType แทน ZodSchema (ZodSchema เป็น alias ที่ deprecated)
export function validate<T extends ZodType>(schema: T, source: ValidateSource = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const input = source === "query" ? req.query : req.body
    const result = schema.safeParse(input)

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.error.issues[0].message,
      })
      return
    }

    // ใช้ข้อมูลที่ผ่าน Zod transform/coerce แล้ว แทนที่ raw input เดิม
    // cast เป็น any เพราะ Zod output<T> กับ Express ParsedQs ไม่ compatible ใน type level
    if (source === "query") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req.query = result.data as any
    } else {
      req.body = result.data
    }
    next()
  }
}
