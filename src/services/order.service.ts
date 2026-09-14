import { CoffeeModel } from "../models/coffee.model.js";
import { type OrderStatus } from "../models/order.model.js";
import { createOrder, findMenuItemsForCoffee, findOrder, findOrderOwnedByCoffee, listOrders, updateOrderStatus } from "../repositories/order.repository.js";
import type { OrderDto } from "../types/order.js";
import { ApiError } from "../utils/ApiError.js";

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "REJECTED"],
  CONFIRMED: [],
  REJECTED: [],
};

function dto(order: any): OrderDto {
  return {
    id: order._id.toString(), coffeeId: order.coffeeId.toString(), tableNumber: order.tableNumber,
    items: order.items.map((item: any) => ({ ...item, itemId: item.itemId.toString() })),
    total: order.total, status: order.status, createdAt: order.createdAt, updatedAt: order.updatedAt,
  };
}

export async function placeOrder(input: {
  coffeeSlug: string; tableNumber: number;
  items: { itemId: string; quantity: number }[];
}): Promise<OrderDto> {
  const coffee = await CoffeeModel.findOne({ slug: input.coffeeSlug }).select({ _id: 1 }).lean().exec();
  if (!coffee) throw new ApiError(404, "Coffee not found");

  const menuItems = await findMenuItemsForCoffee(coffee._id.toString(), input.items.map((item) => item.itemId));
  const byId = new Map(menuItems.map((item) => [item._id.toString(), item]));
  if (menuItems.length !== input.items.length) throw new ApiError(400, "One or more items do not belong to this coffee.");

  let subtotal = 0;
  const snapshots = input.items.map(({ itemId, quantity }) => {
    const item = byId.get(itemId);
    if (!item) throw new ApiError(400, "One or more items do not belong to this coffee.");
    if (item.isAvailable === false) throw new ApiError(409, `Item "${item.name}" is not available.`);
    const unitPrice = item.promotion ?? item.price;
    const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
    subtotal += lineTotal;
    return { itemId: item._id, name: item.name, quantity, unitPrice, subtotal: lineTotal };
  });
  subtotal = Math.round(subtotal * 100) / 100;
  const order = await createOrder({
    coffeeId: coffee._id, tableNumber: input.tableNumber, items: snapshots, total: subtotal, status: "PENDING",
  });
  return dto(order.toObject());
}

export async function getCoffeeOrders(coffeeId: string, status?: OrderStatus, page = 1, limit = 50) {
  const result = await listOrders(coffeeId, status, (page - 1) * limit, limit);
  return { orders: result.orders.map(dto), total: result.total, page, limit };
}

export async function getPublicOrder(orderId: string) {
  const order = await findOrder(orderId);
  if (!order) throw new ApiError(404, "Order not found");
  return dto(order);
}

export async function getCoffeeOrder(coffeeId: string, orderId: string) {
  const order = await findOrderOwnedByCoffee(coffeeId, orderId);
  if (!order) throw new ApiError(404, "Order not found");
  return dto(order);
}

export async function changeOrderStatus(coffeeId: string, orderId: string, nextStatus: OrderStatus) {
  const current = await findOrderOwnedByCoffee(coffeeId, orderId);
  if (!current) throw new ApiError(404, "Order not found");
  if (!transitions[current.status as OrderStatus].includes(nextStatus)) {
    throw new ApiError(409, `Cannot change order status from ${current.status} to ${nextStatus}.`);
  }
  const updated = await updateOrderStatus(coffeeId, orderId, nextStatus, new Date());
  if (!updated) throw new ApiError(404, "Order not found");
  return dto(updated);
}
