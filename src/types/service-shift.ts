import type { ServiceShiftStatus, ServiceShiftType } from "../models/service-shift.model.js";

export interface ServiceShiftDto {
  id: string;
  coffeeId: string;
  status: ServiceShiftStatus;
  name: string | null;
  type: ServiceShiftType;
  label: string | null;
  notes: string | null;
  openedAt: Date;
  closedAt: Date | null;
  summary?: unknown;
}

export interface TableSessionDto {
  id: string;
  coffeeId: string;
  tableNumber: number;
  serviceShiftId: string | null;
  status: "ACTIVE" | "CLOSED";
  openedAt: Date;
  closedAt: Date | null;
  lastOrderAt: Date;
  orderCount: number;
  summary?: unknown;
}
