import { z } from "zod";
import { SLUG_MESSAGE, SLUG_PATTERN } from "../models/coffee.model.js";
import { MONGODB_ID_MESSAGE, MONGODB_ID_PATTERN } from "./category.validators.js";

/**
 * Request schemas for the backoffice. Location-scoped (params/body) so they
 * plug directly into `validate({ params, body })`, matching the public API
 * conventions. Every value is validated before it can reach a service.
 */

export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, "PIN must be exactly 4 digits.");

export const coffeeSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "coffeeSlug is required.")
  .max(80, "coffeeSlug must be at most 80 characters.")
  .regex(SLUG_PATTERN, SLUG_MESSAGE);

export const coffeeIdParamsSchema = z.object({
  coffeeId: z.string().regex(MONGODB_ID_PATTERN, MONGODB_ID_MESSAGE),
});

export const categoryIdParamsSchema = z.object({
  categoryId: z.string().regex(MONGODB_ID_PATTERN, MONGODB_ID_MESSAGE),
});

export const itemIdParamsSchema = z.object({
  itemId: z.string().regex(MONGODB_ID_PATTERN, MONGODB_ID_MESSAGE),
});

export const coffeeSlugParamsSchema = z.object({
  coffeeSlug: coffeeSlugSchema,
});

export const pinBodySchema = z.object({
  pin: pinSchema,
});

export const createCoffeeBodySchema = z.object({
  name: z.string().trim().min(1, "Coffee name is required.").max(120, "Coffee name must be at most 120 characters."),
  logo: z.url("logo must be a valid URL."),
  slug: coffeeSlugSchema.optional(),
});

const updateCoffeeFields = z.object({
  name: z.string().trim().min(1, "Coffee name is required.").max(120, "Coffee name must be at most 120 characters.").optional(),
  logo: z.url("logo must be a valid URL.").optional(),
  slug: coffeeSlugSchema.optional(),
});

/** At least one editable field must be present (used for PATCH on coffees). */
export const updateCoffeeBodySchema = updateCoffeeFields.refine((value) => Object.keys(value).length >= 1, {
  message: "Provide at least one field to update.",
});

export const categoryBodySchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(80, "Category name must be at most 80 characters."),
});

export const itemBodySchema = z.object({
  name: z.string().trim().min(1, "Item name is required.").max(120, "Item name must be at most 120 characters."),
  description: z.string().trim().max(500, "Item description must be at most 500 characters.").optional(),
  price: z.number().finite().nonnegative("Item price must be zero or greater."),
  image: z.url("image must be a valid URL.").optional(),
});

export const updateItemBodySchema = z
  .object({
    name: z.string().trim().min(1, "Item name is required.").max(120, "Item name must be at most 120 characters.").optional(),
    description: z.string().trim().max(500, "Item description must be at most 500 characters.").optional(),
    price: z.number().finite().nonnegative("Item price must be zero or greater.").optional(),
    image: z.url("image must be a valid URL.").optional(),
  })
  .refine((value) => Object.keys(value).length >= 1, {
    message: "Provide at least one field to update.",
  });

export const changePinBodySchema = z
  .object({
    currentPin: pinSchema,
    newPin: pinSchema,
  })
  .refine((value) => value.currentPin !== value.newPin, {
    message: "New PIN must be different from the current PIN.",
    path: ["newPin"],
  });