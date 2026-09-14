import type { OrderStatus } from "../models/order.model.js";

export interface OrderItemDto {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDto {
  id: string;
  coffeeId: string;
  tableNumber: number;
  items: OrderItemDto[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}
