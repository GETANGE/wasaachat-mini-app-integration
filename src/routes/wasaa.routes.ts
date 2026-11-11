import { type RequestHandler, Router } from "express";
import { logout, me } from "../controllers/oauth.controller.ts";
import { deauthorize, session, webhook } from "../controllers/wasaa.controller.ts";
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
// Sign in with WasaaChat: register this as the deauthorize URL in the console.
router.post("/deauthorize", deauthorize);

// Webhooks only accept WasaaChat's signed POST. Opening the URL in a browser
// (a GET) says so, instead of a confusing "Not found".
const postOnly: RequestHandler = (_req, res) => {
  res
    .status(405)
    .set("Allow", "POST")
    .json({ error: "This is a WasaaChat webhook. It only accepts signed POST requests from WasaaChat." });
};
router.get(["/webhook", "/deauthorize"], postOnly);

export default router;
