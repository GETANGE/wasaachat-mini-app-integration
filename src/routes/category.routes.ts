import { Router } from "express";
import {
  create,
  index,
  remove,
  update,
} from "../controllers/category.controller.ts";
import { requireAdmin, requireAuth } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validators/category.validator.ts";

const router = Router();

router.get("/", index);
router.post("/", requireAuth, requireAdmin, validateBody(createCategorySchema), create);
router.patch("/:id", requireAuth, requireAdmin, validateBody(updateCategorySchema), update);
router.delete("/:id", requireAuth, requireAdmin, remove);

export default router;
