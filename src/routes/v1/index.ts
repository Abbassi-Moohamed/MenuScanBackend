import { Router } from "express";
import { coffeeRouter } from "./coffee.routes.js";
import { categoryRouter } from "./category.routes.js";

/**
 * Version 1 of the public API. New breaking versions get a new router
 * mounted here without touching v1.
 */
export const v1Router = Router();

v1Router.use(coffeeRouter);
v1Router.use(categoryRouter);