import { model, Schema, type InferSchemaType, type Types } from "mongoose";

export const SERVICE_SHIFT_STATUSES = ["OPEN", "CLOSED"] as const;
export type ServiceShiftStatus = (typeof SERVICE_SHIFT_STATUSES)[number];
export const SERVICE_SHIFT_TYPES = ["MORNING", "AFTERNOON", "CUSTOM"] as const;
export type ServiceShiftType = (typeof SERVICE_SHIFT_TYPES)[number];

const serviceShiftSchema = new Schema(
  {
    coffeeId: { type: Schema.Types.ObjectId, ref: "Coffee", required: true, index: true },
    status: { type: String, enum: SERVICE_SHIFT_STATUSES, required: true, default: "OPEN", index: true },
    name: { type: String, trim: true, maxlength: 120, default: null },
    type: { type: String, enum: SERVICE_SHIFT_TYPES, default: "CUSTOM" },
    label: { type: String, trim: true, maxlength: 120, default: null },
    notes: { type: String, trim: true, maxlength: 500, default: null },
    openedAt: { type: Date, required: true, default: Date.now },
    closedAt: { type: Date, default: null },
    openedByRole: { type: String, enum: ["COFFEE_ADMIN", "APP_ADMIN"], default: "COFFEE_ADMIN" },
    closedByRole: { type: String, enum: ["COFFEE_ADMIN", "APP_ADMIN"], default: null },
  },
  { timestamps: true, versionKey: false, collection: "service_shifts" },
);

serviceShiftSchema.index(
  { coffeeId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "OPEN" }, name: "uq_service_shifts_active_coffee" },
);
serviceShiftSchema.index({ coffeeId: 1, openedAt: -1 });

export type ServiceShift = InferSchemaType<typeof serviceShiftSchema> & { _id: Types.ObjectId };
export const ServiceShiftModel = model<ServiceShift>("ServiceShift", serviceShiftSchema);
