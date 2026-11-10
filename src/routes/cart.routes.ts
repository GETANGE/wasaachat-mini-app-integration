import { Router } from "express";
import {
  addItem,
  removeItem,
  show,
  updateItem,
} from "../controllers/cart.controller.ts";
import { requireAuth } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  addCartItemSchema,
  updateCartItemSchema,
} from "../validators/cart.validator.ts";

const router = Router();

router.use(requireAuth);

router.get("/", show);
router.post("/items", validateBody(addCartItemSchema), addItem);
router.patch("/items/:productId", validateBody(updateCartItemSchema), updateItem);
router.delete("/items/:productId", removeItem);

export default router;
