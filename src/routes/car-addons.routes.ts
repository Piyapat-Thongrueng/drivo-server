import { Router } from "express";
import { carAddonController } from "../controllers/car-addon.controller";
import { authMiddleware, optionalAuthMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createCarAddonSchema, updateCarAddonSchema } from "../types/dto/car-addon.dto";

const router = Router({ mergeParams: true });

// GET — guest/user เห็นเฉพาะ isAvailable=true; super_admin (ส่ง Bearer) เห็นทั้งหมด
router.get("/", optionalAuthMiddleware, carAddonController.listAddons);

router.post(
  "/",
  authMiddleware,
  requireRole("super_admin"),
  validate(createCarAddonSchema),
  carAddonController.createAddon,
);

router.patch(
  "/:addonId",
  authMiddleware,
  requireRole("super_admin"),
  validate(updateCarAddonSchema),
  carAddonController.updateAddon,
);

router.delete(
  "/:addonId",
  authMiddleware,
  requireRole("super_admin"),
  carAddonController.deleteAddon,
);

export default router;
