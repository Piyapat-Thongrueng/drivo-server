import { Router } from "express"
import adminRouter from "./admin.routes"
import authRouter from "./auth.routes"
import branchRouter from "./branch.routes"
import userRouter from "./user.routes"

const router = Router()

router.use("/auth", authRouter)

/** Role-scoped APIs — use these patterns for real customer / branch / admin features */
router.use("/user", userRouter)
router.use("/branch", branchRouter)
router.use("/admin", adminRouter)

export default router
