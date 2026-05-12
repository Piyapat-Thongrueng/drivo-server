import { Request, Response, NextFunction } from "express"
import { AppError } from "../utils/error"

// Express error handler ต้องรับ 4 parameters เสมอเพื่อให้ Express รู้ว่าเป็น error handler
export function errorMiddleware(
  err: AppError | Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Error ที่เราสร้างเองด้วย createError — ส่ง message และ statusCode ตรงๆ
  if ("isAppError" in err && err.isAppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    })
    return
  }

  // Error ที่ไม่คาดคิด เช่น database crash หรือ unhandled exception
  // ไม่แสดง stack trace ให้ client เห็น เพราะอาจมีข้อมูล sensitive
  console.error("Unexpected error:", err)
  res.status(500).json({
    success: false,
    message: "Something went wrong",
  })
}
