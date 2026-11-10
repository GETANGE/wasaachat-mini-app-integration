import type { Request, Response } from "express";
import { payOrder } from "../services/payment.service.ts";
import { parseId } from "../utils/parse.ts";

export async function pay(req: Request, res: Response) {
  const result = await payOrder(req.user!.id, parseId(req.params.orderId));
  res.status(201).json(result);
}
