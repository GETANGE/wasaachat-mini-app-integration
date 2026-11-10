import { Router } from "express";
import { pay } from "../controllers/payment.controller.ts";
import { requireAuth } from "../middleware/auth.ts";

const router = Router();

router.use(requireAuth);

router.post("/orders/:orderId/pay", pay);

export default router;
