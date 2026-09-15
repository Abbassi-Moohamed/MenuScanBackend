import type { Request, Response } from "express";
import { getPublicOrder, placeOrder } from "../services/order.service.js";
import { sendSuccess } from "../utils/http.js";

export async function createOrderController(req: Request, res: Response): Promise<void> {
  const body = req.validated!.body as Parameters<typeof placeOrder>[0];
  const sessionToken = body.sessionToken ?? req.get("x-session-token") ?? undefined;
  const order = await placeOrder({ ...body, sessionToken });
  sendSuccess(res, order, 201);
}

export async function getOrderController(req: Request, res: Response): Promise<void> {
  const { orderId } = req.validated!.params as { orderId: string };
  const query = req.validated?.query as { sessionToken?: string } | undefined;
  sendSuccess(res, await getPublicOrder(orderId, query?.sessionToken ?? req.get("x-session-token") ?? undefined));
}
