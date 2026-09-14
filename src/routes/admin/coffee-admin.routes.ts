import { Router } from "express";
import {
  changeMyPinController,
  getMyCoffeeController,
  updateMyCoffeeController,
} from "../../controllers/admin/coffee-admin/coffee.controller.js";
import {
  createMyCategoryController,
  deleteMyCategoryController,
  listMyCategoriesController,
  updateMyCategoryController,
} from "../../controllers/admin/coffee-admin/category.controller.js";
import {
  createMyItemController,
  deleteMyItemController,
  listMyCategoryItemsController,
  updateMyItemController,
} from "../../controllers/admin/coffee-admin/item.controller.js";
import { requireAdmin, requireCoffeeAdmin } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  categoryIdParamsSchema,
  changePinBodySchema,
  categoryBodySchema,
  itemBodySchema,
  itemIdParamsSchema,
  updateCoffeeBodySchema,
  updateItemBodySchema,
} from "../../validators/admin.validators.js";
import {
  listMyOrdersController,
  getMyOrderController,
  updateMyOrderStatusController,
} from "../../controllers/admin/coffee-admin/order.controller.js";
import { orderIdParamsSchema, orderStatusBodySchema, listOrdersQuerySchema } from "../../validators/order.validators.js";

/**
 * Coffee-admin endpoints. Mounted at /my-coffee; the owning coffee comes from
 * the token, NOT from any request input — so these routes can only ever touch
 * the admin's own coffee, categories and items.
 */
export const coffeeAdminRouter = Router();

coffeeAdminRouter.use(requireAdmin, requireCoffeeAdmin);

coffeeAdminRouter.get("/orders", validate({ query: listOrdersQuerySchema }), listMyOrdersController);
coffeeAdminRouter.get("/orders/:orderId", validate({ params: orderIdParamsSchema }), getMyOrderController);
coffeeAdminRouter.patch(
  "/orders/:orderId/status",
  validate({ params: orderIdParamsSchema, body: orderStatusBodySchema }),
  updateMyOrderStatusController,
);

// Coffee information + PIN change.
coffeeAdminRouter.get("/", getMyCoffeeController);
coffeeAdminRouter.patch("/", validate({ body: updateCoffeeBodySchema }), updateMyCoffeeController);
coffeeAdminRouter.patch("/pin", validate({ body: changePinBodySchema }), changeMyPinController);

// Categories.
coffeeAdminRouter.get("/categories", listMyCategoriesController);
coffeeAdminRouter.post("/categories", validate({ body: categoryBodySchema }), createMyCategoryController);
coffeeAdminRouter.patch(
  "/categories/:categoryId",
  validate({ params: categoryIdParamsSchema, body: categoryBodySchema }),
  updateMyCategoryController,
);
coffeeAdminRouter.delete(
  "/categories/:categoryId",
  validate({ params: categoryIdParamsSchema }),
  deleteMyCategoryController,
);

// Items (scoped to the admin's own categories).
coffeeAdminRouter.get(
  "/categories/:categoryId/items",
  validate({ params: categoryIdParamsSchema }),
  listMyCategoryItemsController,
);
coffeeAdminRouter.post(
  "/categories/:categoryId/items",
  validate({ params: categoryIdParamsSchema, body: itemBodySchema }),
  createMyItemController,
);
coffeeAdminRouter.patch("/items/:itemId", validate({ params: itemIdParamsSchema, body: updateItemBodySchema }), updateMyItemController);
coffeeAdminRouter.delete(
  "/items/:itemId",
  validate({ params: itemIdParamsSchema }),
  deleteMyItemController,
);