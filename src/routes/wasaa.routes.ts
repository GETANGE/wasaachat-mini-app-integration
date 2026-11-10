import { Router } from "express";
import { logout, me } from "../controllers/oauth.controller.ts";
import { session, webhook } from "../controllers/wasaa.controller.ts";
import { requireAuth } from "../middleware/auth.ts";
import { wasaaSessionRateLimiter } from "../middleware/rateLimiter.ts";
import { validateBody } from "../middleware/validate.ts";
import { launchSessionSchema } from "../validators/wasaa.validator.ts";

const router = Router();

// code2Session: exchange wasaa.launchCode for a shop session.
router.post(
  "/session",
  wasaaSessionRateLimiter,
  validateBody(launchSessionSchema),
  session,
);
router.get("/me", requireAuth, me);
router.post("/logout", logout);
router.post("/webhook", webhook);

export default router;
