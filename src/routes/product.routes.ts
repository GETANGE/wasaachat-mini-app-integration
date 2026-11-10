import { Router } from "express";
import {
  create,
  index,
  remove,
  show,
  update,
} from "../controllers/product.controller.ts";
import { requireAdmin, requireAuth } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  createProductSchema,
  updateProductSchema,
} from "../validators/product.validator.ts";

const router = Router();

router.get("/", index);
router.get("/:slug", show);
router.post("/", requireAuth, requireAdmin, validateBody(createProductSchema), create);
router.patch("/:id", requireAuth, requireAdmin, validateBody(updateProductSchema), update);
router.delete("/:id", requireAuth, requireAdmin, remove);

export default router;
