import { Router } from "express";
import { callback, start } from "../controllers/oauth.controller.ts";
import { wasaaSessionRateLimiter } from "../middleware/rateLimiter.ts";

// Sign in with WasaaChat (web). Mounted at /auth — these are browser
// navigations, not JSON API calls. Register the callback URL in the
// WasaaChat developer console as a redirect URI.
const router = Router();

router.get("/wasaachat", wasaaSessionRateLimiter, start);
router.get("/wasaachat/callback", wasaaSessionRateLimiter, callback);

export default router;
