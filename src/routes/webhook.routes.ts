import { Router } from "express"
import { paymentController } from "../controllers/payment.controller"

const webhookRouter = Router()

// POST /api/webhooks/stripe
// หมายเหตุ: route นี้ต้องรับ raw body (Buffer) ไม่ใช่ JSON ที่ parse แล้ว
// express.raw() ถูกตั้งไว้ใน app.ts ก่อน express.json() สำหรับ path นี้
// ไม่ต้องใช้ authMiddleware เพราะ Stripe verify ด้วย signature แทน
webhookRouter.post("/stripe", paymentController.stripeWebhook)

export default webhookRouter
