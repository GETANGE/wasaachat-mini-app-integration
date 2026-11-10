import type { Request, Response } from "express";
import {
  cancelOrder,
  checkout,
  getOrder,
  listOrders,
  prepareWasaPayment,
  updateOrderStatus,
} from "../services/order.service.ts";
import { parseId } from "../utils/parse.ts";

export async function create(req: Request, res: Response) {
  const order = await checkout(req.user!.id, req.body.shippingAddress);
  res.status(201).json({ order });
}

export async function index(req: Request, res: Response) {
  const orders = await listOrders(req.user!.id);
  res.json({ orders });
}

export async function show(req: Request, res: Response) {
  const order = await getOrder(req.user!.id, parseId(req.params.id));
  res.json({ order });
}

export async function cancel(req: Request, res: Response) {
  const order = await cancelOrder(req.user!.id, parseId(req.params.id));
  res.json({ order });
}

export async function preparePayment(req: Request, res: Response) {
  const payment = await prepareWasaPayment(
    req.user!.id,
    parseId(req.params.id),
  );
  res.status(201).json(payment);
}

export async function setStatus(req: Request, res: Response) {
  const order = await updateOrderStatus(parseId(req.params.id), req.body.status);
  res.json({ order });
}
