import { hashPin, verifyPin } from "../../auth/pin.js";
import {
  findAdminCoffeeById,
  findCoffeeWithPinHashById,
  isCoffeeSlugTaken,
  updateAdminCoffee,
  updateCoffeePinHash,
} from "../../repositories/admin/coffee.repository.js";
import {
  createCategoryForCoffee,
  deleteCategoryOwnedByCoffee,
  findCategoryOwnedByCoffee,
  listCategoriesOfCoffee,
  updateCategoryOwnedByCoffee,
} from "../../repositories/admin/category.repository.js";
import {
  createItemForCategory,
  deleteItemOwnedByCoffee,
  listItemsOfCategory,
  updateItemOwnedByCoffee,
} from "../../repositories/admin/item.repository.js";
import type {
  AdminCategoryDto,
  AdminCoffeeDto,
  AdminItemDto,
  CoffeeUpdateInput,
} from "../../types/index.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Coffee-admin operations. Everything is scoped to the single coffee bound to
 * the authenticated token (`coffeeId`). No `coffeeId`, `categoryId` or
 * `itemId` coming from the frontend is ever trusted on its own — ownership is
 * re-validated against the stored relationships for every operation.
 */

export interface CreateItemInput {
  name: string;
  description?: string;
  price: number;
  image?: string;
}

export interface UpdateItemInput {
  name?: string;
  description?: string;
  price?: number;
  image?: string;
}

function coffeeToDto(coffee: {
  id: string;
  name: string;
  logo: string;
  slug: string;
  categoryCount: number;
  createdAt: Date;
  updatedAt: Date;
}): AdminCoffeeDto {
  return coffee;
}

function categoryToDto(category: {
  _id: import("mongoose").Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): AdminCategoryDto {
  return {
    id: category._id.toString(),
    name: category.name,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function itemToDto(item: {
  _id: import("mongoose").Types.ObjectId;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  itemCategoryId: import("mongoose").Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}): AdminItemDto {
  return {
    id: item._id.toString(),
    name: item.name,
    description: item.description,
    price: item.price,
    image: item.image,
    itemCategoryId: item.itemCategoryId.toString(),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

async function assertMySlugAvailable(slug: string, excludeId: string): Promise<void> {
  if (await isCoffeeSlugTaken(slug, excludeId)) {
    throw new ApiError(409, "Slug is already taken");
  }
}

export async function getMyCoffee(coffeeId: string): Promise<AdminCoffeeDto> {
  const coffee = await findAdminCoffeeById(coffeeId);
  if (!coffee) throw new ApiError(404, "Coffee not found");
  return coffeeToDto({
    id: coffee._id.toString(),
    name: coffee.name,
    logo: coffee.logo,
    slug: coffee.slug,
    categoryCount: coffee.categoryCount,
    createdAt: coffee.createdAt,
    updatedAt: coffee.updatedAt,
  });
}

export async function updateMyCoffee(coffeeId: string, input: CoffeeUpdateInput): Promise<AdminCoffeeDto> {
  if (input.slug !== undefined) {
    await assertMySlugAvailable(input.slug, coffeeId);
  }

  const patch: Partial<{ name: string; logo: string; slug: string }> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.logo !== undefined) patch.logo = input.logo;
  if (input.slug !== undefined) patch.slug = input.slug;

  const updated = await updateAdminCoffee(coffeeId, patch);
  if (!updated) throw new ApiError(404, "Coffee not found");
  return coffeeToDto({
    id: updated._id.toString(),
    name: updated.name,
    logo: updated.logo,
    slug: updated.slug,
    categoryCount: updated.categoryCount,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

export async function changeMyPin(
  coffeeId: string,
  currentPin: string,
  newPin: string,
): Promise<{ id: string }> {
  const coffee = await findCoffeeWithPinHashById(coffeeId);
  if (!coffee) throw new ApiError(404, "Coffee not found");

  const valid =
    coffee.adminPinHash !== undefined && coffee.adminPinHash !== null && (await verifyPin(currentPin, coffee.adminPinHash));
  if (!valid) throw new ApiError(401, "Invalid current PIN");

  const adminPinHash = await hashPin(newPin);
  await updateCoffeePinHash(coffeeId, adminPinHash);
  return { id: coffeeId };
}

// ---- Categories -----------------------------------------------------------

export async function listCategories(coffeeId: string): Promise<AdminCategoryDto[]> {
  const categories = await listCategoriesOfCoffee(coffeeId);
  return categories.map(categoryToDto);
}

export async function createCategory(coffeeId: string, name: string): Promise<AdminCategoryDto> {
  try {
    const category = await createCategoryForCoffee(coffeeId, name);
    return categoryToDto(category);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, "A category with this name already exists for this coffee");
    }
    throw error;
  }
}

export async function updateCategory(
  coffeeId: string,
  categoryId: string,
  name: string,
): Promise<AdminCategoryDto> {
  try {
    const category = await updateCategoryOwnedByCoffee(coffeeId, categoryId, name);
    if (!category) throw new ApiError(404, "Category not found");
    return categoryToDto(category);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, "A category with this name already exists for this coffee");
    }
    throw error;
  }
}

/** Deletes the category and its items (dependency-order, no orphans). */
export async function deleteCategory(coffeeId: string, categoryId: string): Promise<{ id: string }> {
  const deleted = await deleteCategoryOwnedByCoffee(coffeeId, categoryId);
  if (!deleted) throw new ApiError(404, "Category not found");
  return { id: categoryId };
}

// ---- Items ----------------------------------------------------------------

export async function listItems(coffeeId: string, categoryId: string): Promise<AdminItemDto[]> {
  const category = await findCategoryOwnedByCoffee(coffeeId, categoryId);
  if (!category) throw new ApiError(404, "Category not found");

  const items = await listItemsOfCategory(categoryId);
  return items.map(itemToDto);
}

export async function createItem(
  coffeeId: string,
  categoryId: string,
  input: CreateItemInput,
): Promise<AdminItemDto> {
  const category = await findCategoryOwnedByCoffee(coffeeId, categoryId);
  if (!category) throw new ApiError(404, "Category not found");

  const item = await createItemForCategory(categoryId, {
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    image: input.image ?? null,
  });
  return itemToDto(item);
}

export async function updateItem(
  coffeeId: string,
  itemId: string,
  input: UpdateItemInput,
): Promise<AdminItemDto> {
  const patch: UpdateItemInput = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.price !== undefined) patch.price = input.price;
  if (input.image !== undefined) patch.image = input.image;

  const item = await updateItemOwnedByCoffee(coffeeId, itemId, patch);
  if (!item) throw new ApiError(404, "Item not found");
  return itemToDto(item);
}

export async function deleteItem(coffeeId: string, itemId: string): Promise<{ id: string }> {
  const deleted = await deleteItemOwnedByCoffee(coffeeId, itemId);
  if (!deleted) throw new ApiError(404, "Item not found");
  return { id: itemId };
}