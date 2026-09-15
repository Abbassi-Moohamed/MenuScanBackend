import { Types } from "mongoose";
import { closeTableSession, getTableSessionSummary, listTableSessions } from "../repositories/table-session.repository.js";
import {
  closeServiceShift,
  createServiceShift,
  findCurrentServiceShift,
  findServiceShiftOwnedByCoffee,
  getServiceShiftSummary,
  listServiceShifts,
} from "../repositories/service-shift.repository.js";
import type { ServiceShiftDto, TableSessionDto } from "../types/service-shift.js";
import { ApiError } from "../utils/ApiError.js";

function shiftDto(shift: any, summary?: unknown): ServiceShiftDto {
  return {
    id: shift._id.toString(),
    coffeeId: shift.coffeeId.toString(),
    status: shift.status,
    name: shift.name ?? shift.label ?? null,
    type: shift.type ?? "CUSTOM",
    label: shift.label ?? null,
    notes: shift.notes ?? null,
    openedAt: shift.openedAt,
    closedAt: shift.closedAt ?? null,
    ...(summary !== undefined ? { summary } : {}),
  };
}

function sessionDto(session: any, summary?: unknown): TableSessionDto {
  return {
    id: session._id.toString(),
    coffeeId: session.coffeeId.toString(),
    tableNumber: session.tableNumber,
    serviceShiftId: session.serviceShiftId?.toString() ?? null,
    status: session.status,
    openedAt: session.openedAt,
    closedAt: session.closedAt ?? null,
    lastOrderAt: session.lastOrderAt,
    orderCount: session.orderCount,
    ...(summary !== undefined ? { summary } : {}),
  };
}

function paymentOrderDto(order: any) {
  return {
    id: order._id.toString(),
    tableNumber: order.tableNumber,
    status: order.status,
    paymentStatus: order.paymentStatus ?? "UNPAID",
    total: order.total,
  };
}

function sessionSummaryDto(summary: any) {
  if (!summary) return summary;
  return {
    ...summary,
    orders: Array.isArray(summary.orders) ? summary.orders.map(paymentOrderDto) : [],
  };
}

export async function getCurrentServiceShift(coffeeId: string): Promise<ServiceShiftDto | null> {
  const shift = await findCurrentServiceShift(coffeeId);
  return shift ? shiftDto(shift, await getServiceShiftSummary(coffeeId, shift._id.toString())) : null;
}

export async function openServiceShift(coffeeId: string, input: { name?: string; type?: "MORNING" | "AFTERNOON" | "CUSTOM"; label?: string; notes?: string }): Promise<ServiceShiftDto> {
  const current = await findCurrentServiceShift(coffeeId);
  if (current) throw new ApiError(409, "A service shift is already open.");
  try {
    const shift = await createServiceShift({
      coffeeId: new Types.ObjectId(coffeeId),
      status: "OPEN",
      name: input.name ?? input.label ?? null,
      type: input.type ?? "CUSTOM",
      label: input.label ?? null,
      notes: input.notes ?? null,
      openedByRole: "COFFEE_ADMIN",
    });
    return shiftDto(shift);
  } catch (error) {
    if (typeof error === "object" && error !== null && (error as { code?: number }).code === 11000) {
      throw new ApiError(409, "A service shift is already open.");
    }
    throw error;
  }
}

export async function getServiceShifts(coffeeId: string, status?: "OPEN" | "CLOSED", page = 1, limit = 50) {
  const result = await listServiceShifts(coffeeId, status, (page - 1) * limit, limit);
  return {
    shifts: result.shifts.map((shift) => shiftDto(shift, (shift as { summary?: unknown }).summary)),
    total: result.total,
    page,
    limit,
  };
}

export async function getServiceShift(coffeeId: string, shiftId: string): Promise<ServiceShiftDto> {
  const shift = await findServiceShiftOwnedByCoffee(coffeeId, shiftId);
  if (!shift) throw new ApiError(404, "Service shift not found.");
  return shiftDto(shift, await getServiceShiftSummary(coffeeId, shiftId));
}

export async function finishServiceShift(coffeeId: string, shiftId: string): Promise<ServiceShiftDto> {
  const existing = await findServiceShiftOwnedByCoffee(coffeeId, shiftId);
  if (!existing) throw new ApiError(404, "Service shift not found.");
  if (existing.status !== "OPEN") {
    throw new ApiError(409, "Service shift is already closed.");
  }

  const openTables = await listTableSessions(coffeeId, {
    serviceShiftId: shiftId,
    status: "ACTIVE",
    limit: 1000,
  });
  if (openTables.total > 0) {
    throw new ApiError(409, "Some tables must be closed before closing the service.", {
      code: "OPEN_TABLES_REMAIN",
      tables: openTables.sessions.map((table: any) => {
        const orderSummary = Array.isArray(table.orderSummary) ? table.orderSummary : [];
        return {
          id: table._id.toString(),
          tableNumber: table.tableNumber,
          orders: orderSummary.reduce((total: number, row: any) => total + Number(row.count ?? 0), 0),
          revenue: orderSummary
            .filter((row: any) => row._id?.status === "CONFIRMED")
            .reduce((total: number, row: any) => total + Number(row.revenue ?? 0), 0),
        };
      }),
    });
  }

  const closed = await closeServiceShift(coffeeId, shiftId);
  if (!closed) {
    throw new ApiError(409, "Service shift is already closed.");
  }
  return shiftDto(closed, await getServiceShiftSummary(coffeeId, shiftId));
}

export async function finishCurrentServiceShift(coffeeId: string): Promise<ServiceShiftDto> {
  const current = await findCurrentServiceShift(coffeeId);
  if (!current) throw new ApiError(404, "No open service shift.");
  return finishServiceShift(coffeeId, current._id.toString());
}

export async function getCoffeeTableSessions(
  coffeeId: string,
  options: { serviceShiftId?: string; status?: "ACTIVE" | "CLOSED"; page?: number; limit?: number } = {},
) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;
  const result = await listTableSessions(coffeeId, { ...options, skip: (page - 1) * limit, limit });
  return { sessions: result.sessions.map((session) => sessionDto(session)), total: result.total, page, limit };
}

export async function getCoffeeTableSession(coffeeId: string, sessionId: string): Promise<TableSessionDto> {
  const summary = await getTableSessionSummary(coffeeId, sessionId);
  if (!summary) throw new ApiError(404, "Table session not found.");
  return sessionDto(summary, sessionSummaryDto(summary));
}

export async function finishTableSession(coffeeId: string, sessionId: string): Promise<TableSessionDto> {
  const current = await getTableSessionSummary(coffeeId, sessionId);
  if (!current) throw new ApiError(404, "Table session not found.");
  if (current.status !== "ACTIVE") {
    return sessionDto(current, sessionSummaryDto(current));
  }
  const unpaidOrders = Array.isArray((current as { orders?: unknown[] }).orders)
    ? (current as { orders: any[] }).orders.filter(
        (order) => order.status === "CONFIRMED" && order.paymentStatus !== "PAID",
      )
    : [];
  const pendingOrders = Array.isArray((current as { orders?: unknown[] }).orders)
    ? (current as { orders: any[] }).orders.filter((order) => order.status === "PENDING")
    : [];
  if (pendingOrders.length > 0) {
    throw new ApiError(409, "Table has pending orders.", {
      code: "TABLE_PENDING_ORDERS",
      orders: pendingOrders.map(paymentOrderDto),
    });
  }
  if (unpaidOrders.length > 0) {
    throw new ApiError(409, "Table has unpaid confirmed orders.", {
      code: "TABLE_UNPAID_ORDERS",
      orders: unpaidOrders.map(paymentOrderDto),
    });
  }
  const closed = await closeTableSession(coffeeId, sessionId);
  if (!closed) {
    const existing = await getTableSessionSummary(coffeeId, sessionId);
    if (!existing) throw new ApiError(404, "Table session not found.");
    // Closing is intentionally idempotent. A stale dashboard or a retried
    // request should receive the closed session state rather than an
    // operational conflict.
    return sessionDto(existing, sessionSummaryDto(existing));
  }
  const summary = await getTableSessionSummary(coffeeId, sessionId);
  return sessionDto(closed, summary ? sessionSummaryDto(summary) : undefined);
}
