import { Router } from "express";
import cartRoutes from "./cart.routes.ts";
import categoryRoutes from "./category.routes.ts";
import orderRoutes from "./order.routes.ts";
import paymentRoutes from "./payment.routes.ts";
import productRoutes from "./product.routes.ts";
import wasaaRoutes from "./wasaa.routes.ts";

const router = Router();

router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/wasaa", wasaaRoutes);

export default router;
