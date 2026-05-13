import { Router } from "express"
import adminRouter from "./admin.routes"
import authRouter from "./auth.routes"
import branchRouter from "./branch.routes"
import countryRouter from "./country.routes"
import userRouter from "./user.routes"

const router = Router()

router.use("/auth", authRouter)

// Public resource — ทุกคนเข้าถึงได้ (user ต้องเห็นรายการประเทศตอนค้นหารถ)
router.use("/countries", countryRouter)

/** Role-scoped APIs — use these patterns for real customer / branch / admin features */
router.use("/user", userRouter)
router.use("/branch", branchRouter)
router.use("/admin", adminRouter)

export default router
