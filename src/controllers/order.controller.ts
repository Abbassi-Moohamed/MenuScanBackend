import type { Request, Response } from "express";
import { getPublicOrder, placeOrder } from "../services/order.service.js";
import { sendSuccess } from "../utils/http.js";

export async function createOrderController(req: Request, res: Response): Promise<void> {
  const order = await placeOrder(req.validated!.body as Parameters<typeof placeOrder>[0]);
  sendSuccess(res, order, 201);
}

export async function getOrderController(req: Request, res: Response): Promise<void> {
  const { orderId } = req.validated!.params as { orderId: string };
  sendSuccess(res, await getPublicOrder(orderId));
}
