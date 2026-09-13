import { Router } from "express";
import { adminAuthRouter } from "./auth.routes.js";
import { appAdminCoffeesRouter } from "./app-admin.routes.js";
import { coffeeAdminRouter } from "./coffee-admin.routes.js";

/**
 * Backoffice routing, separated by role:
 *
 *   /api/v1/admin/auth/*        → PIN → bearer token (both roles)
 *   /api/v1/admin/coffees/*     → application admin only
 *   /api/v1/admin/my-coffee/*   → coffee admin only (their own coffee)
 */
export const adminRouter = Router();

adminRouter.use("/auth", adminAuthRouter);
adminRouter.use("/coffees", appAdminCoffeesRouter);
adminRouter.use("/my-coffee", coffeeAdminRouter);