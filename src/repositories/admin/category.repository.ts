import { Types } from "mongoose";
import { ItemCategoryModel } from "../../models/item-category.model.js";
import { ItemModel } from "../../models/item.model.js";

/**
 * Coffee-admin category data access. Every query is scoped by BOTH the
 * target category id AND the owning coffee id — knowing another coffee's
 * ObjectId is never enough to touch its categories.
 */

export interface AdminCategoryRow {
  _id: Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const SAFE_FIELDS = { name: 1, createdAt: 1, updatedAt: 1 } as const;

function toRow(category: {
  _id: Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): AdminCategoryRow {
  return { _id: category._id, name: category.name, createdAt: category.createdAt, updatedAt: category.updatedAt };
}

export async function listCategoriesOfCoffee(coffeeId: string): Promise<AdminCategoryRow[]> {
  if (!Types.ObjectId.isValid(coffeeId)) return [];
  const categories = await ItemCategoryModel.find({ coffeeId })
    .sort({ name: 1 })
    .select(SAFE_FIELDS)
    .lean()
    .exec();
  return categories.map(toRow);
}

export async function createCategoryForCoffee(
  coffeeId: string,
  name: string,
): Promise<AdminCategoryRow> {
  const category = await ItemCategoryModel.create({ coffeeId, name });
  return {
    _id: category._id,
    name: category.name,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

/** Finds a category that belongs to the given coffee (ownership check). */
export async function findCategoryOwnedByCoffee(
  coffeeId: string,
  categoryId: string,
): Promise<AdminCategoryRow | null> {
  if (!Types.ObjectId.isValid(coffeeId) || !Types.ObjectId.isValid(categoryId)) return null;
  const category = await ItemCategoryModel.findOne({ _id: categoryId, coffeeId }).lean().exec();
  return category ? toRow(category) : null;
}

export async function updateCategoryOwnedByCoffee(
  coffeeId: string,
  categoryId: string,
  name: string,
): Promise<AdminCategoryRow | null> {
  if (!Types.ObjectId.isValid(coffeeId) || !Types.ObjectId.isValid(categoryId)) return null;
  const category = await ItemCategoryModel.findOneAndUpdate(
    { _id: categoryId, coffeeId },
    { name },
    { returnDocument: "after", runValidators: true },
  )
    .select(SAFE_FIELDS)
    .lean()
    .exec();
  return category ? toRow(category) : null;
}

/**
 * Deletes a category and every item it owns (dependency-order delete:
 * items first, then the category).
 */
export async function deleteCategoryOwnedByCoffee(coffeeId: string, categoryId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(coffeeId) || !Types.ObjectId.isValid(categoryId)) return false;
  const category = await ItemCategoryModel.findOne({ _id: categoryId, coffeeId })
    .select({ _id: 1 })
    .lean()
    .exec();
  if (!category) return false;

  await ItemModel.deleteMany({ itemCategoryId: category._id });
  await ItemCategoryModel.deleteOne({ _id: category._id });
  return true;
}