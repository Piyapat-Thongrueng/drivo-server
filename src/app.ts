import express from "express"
import cors from "cors"
import router from "./routes"
import { errorMiddleware } from "./middlewares/error.middleware"

// Import types augmentation so req.user and req.supabaseAuthId are available globally
import "./types"

// ให้ JSON.stringify / res.json serialize bigint จาก Drizzle ได้ (เช่น users.id)
;(BigInt.prototype as { toJSON?: () => number }).toJSON = function (this: bigint) {
  return Number(this)
}

const app = express()

app.use(cors())
app.use(express.json())

app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

app.use("/api", router)

// Error handler ต้องอยู่หลัง routes ทั้งหมดเสมอ
// เหตุผล: Express อ่าน middleware ตามลำดับ error handler ที่อยู่ก่อน routes จะไม่ถูกเรียก
app.use(errorMiddleware)

export default app
