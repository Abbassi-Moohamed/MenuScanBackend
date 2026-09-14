import type { Request, Response } from "express";
import { changeOrderStatus, getCoffeeOrder, getCoffeeOrders } from "../../../services/order.service.js";
import { sendSuccess } from "../../../utils/http.js";
const coffeeId = (req: Request) => req.admin!.coffeeId!;

export async function listMyOrdersController(req: Request, res: Response): Promise<void> {
  const query = req.validated!.query as { status?: any; page: number; limit: number };
  sendSuccess(res, await getCoffeeOrders(coffeeId(req), query.status, query.page, query.limit));
}
export async function getMyOrderController(req: Request, res: Response): Promise<void> {
  const { orderId } = req.validated!.params as { orderId: string };
  sendSuccess(res, await getCoffeeOrder(coffeeId(req), orderId));
}
export async function updateMyOrderStatusController(req: Request, res: Response): Promise<void> {
  const { orderId } = req.validated!.params as { orderId: string };
  const { status } = req.validated!.body as { status: any };
  sendSuccess(res, await changeOrderStatus(coffeeId(req), orderId, status));
}
