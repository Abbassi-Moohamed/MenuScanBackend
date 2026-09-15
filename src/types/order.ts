import type { OrderStatus, PaymentStatus } from "../models/order.model.js";

export interface OrderItemDto {
  itemId: string;
  name: string;
  image: string | null;
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
  paymentStatus: PaymentStatus;
  paidAt: Date | null;
  paidBy: string | null;
  tableSessionId: string | null;
  serviceShiftId: string | null;
  /** Returned only when a new/accepted anonymous session token is supplied. */
  sessionToken?: string;
  createdAt: Date;
  updatedAt: Date;
}
