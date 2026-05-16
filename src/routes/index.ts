import { Router } from "express"
import adminRouter from "./admin.routes"
import authRouter from "./auth.routes"
import bookingRouter from "./booking.routes"
import branchRouter from "./branch.routes"
import branchesRouter from "./branches.routes"
import carsRouter from "./cars.routes"
import countryRouter from "./country.routes"
import oneWayFeesRouter from "./one-way-fees.routes"
import pricingRouter from "./pricing.routes"
import userRouter from "./user.routes"

const router = Router()

router.use("/auth", authRouter)

// Public resources — ทุกคนเข้าถึงได้ (user ต้องเห็นตอนค้นหารถ)
router.use("/countries", countryRouter)
router.use("/branches", branchesRouter)
router.use("/one-way-fees", oneWayFeesRouter)
router.use("/cars", carsRouter)
router.use("/pricing", pricingRouter)

/** Role-scoped APIs — use these patterns for real customer / branch / admin features */
router.use("/bookings", bookingRouter)
router.use("/user", userRouter)
router.use("/branch", branchRouter)
router.use("/admin", adminRouter)

export default router
