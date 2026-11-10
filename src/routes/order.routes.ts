import { Router } from "express";
import {
  cancel,
  create,
  index,
  preparePayment,
  setStatus,
  show,
} from "../controllers/order.controller.ts";
import { requireAdmin, requireAuth } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  checkoutSchema,
  updateOrderStatusSchema,
} from "../validators/order.validator.ts";

const router = Router();

router.use(requireAuth);

router.post("/checkout", validateBody(checkoutSchema), create);
router.get("/", index);
router.patch("/:id/status", requireAdmin, validateBody(updateOrderStatusSchema), setStatus);
router.post("/:id/payment", preparePayment);
router.post("/:id/cancel", cancel);
router.get("/:id", show);

export default router;
