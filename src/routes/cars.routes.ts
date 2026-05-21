import { Router } from "express";
import { carController } from "../controllers/car.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import { availableQuerySchema, createCarSchema, updateCarSchema } from "../types/dto/car.dto";
import carAddonsRouter from "./car-addons.routes";

const router = Router();

// GET /api/cars — admin ดูรายการรถทั้งหมด (รองรับ ?branchId=1)
router.get("/", authMiddleware, requireRole("super_admin"), carController.listCars);

// GET /api/cars/available — public (user ใช้ตอนค้นหา)
// ต้องวางก่อน /:id เพื่อไม่ให้ "available" ถูก parse เป็น param
router.get(
  "/available",
  validate(availableQuerySchema, "query"),
  carController.getAvailableCars,
);

// Nested: /api/cars/:carId/addons — ต้องวางก่อน /:id เพื่อไม่ให้ carId กลืน path "addons"
router.use("/:carId/addons", carAddonsRouter);

// GET /api/cars/:id — public
router.get("/:id", carController.getCar);

// POST /api/cars — super_admin เท่านั้น
router.post(
  "/",
  authMiddleware,
  requireRole("super_admin"),
  validate(createCarSchema),
  carController.createCar,
);

// PATCH /api/cars/:id — super_admin เท่านั้น
router.patch(
  "/:id",
  authMiddleware,
  requireRole("super_admin"),
  validate(updateCarSchema),
  carController.updateCar,
);

// DELETE /api/cars/:id — super_admin เท่านั้น
router.delete(
  "/:id",
  authMiddleware,
  requireRole("super_admin"),
  carController.deleteCar,
);

export default router;
