import express from "express";
import cors from "cors";
import router from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";

// Import types augmentation so req.user and req.supabaseAuthId are available globally
import "./types";

// ให้ JSON.stringify / res.json serialize bigint จาก Drizzle ได้ (เช่น users.id)
(BigInt.prototype as { toJSON?: () => number }).toJSON = function (
  this: bigint,
) {
  return Number(this);
};

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    credentials: true,
  }),
);

// Stripe webhook ต้องการ raw body (Buffer) เพื่อตรวจ signature
// ต้องตั้งก่อน express.json() เพราะถ้า JSON parse ไปก่อนจะทำให้ signature verify ล้มเหลว
app.use(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
);

// API อื่นๆ ใช้ JSON body parser ตามปกติ
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", router);

// Error handler ต้องอยู่หลัง routes ทั้งหมดเสมอ
// เหตุผล: Express อ่าน middleware ตามลำดับ error handler ที่อยู่ก่อน routes จะไม่ถูกเรียก
app.use(errorMiddleware);

export default app;
