import { CoffeeModel } from "../models/coffee.model.js";
import { ItemCategoryModel } from "../models/item-category.model.js";

export interface CategoryRecord {
  id: string;
  name: string;
  image: string | null;
}

export interface CoffeeWithCategoriesRecord {
  id: string;
  name: string;
  logo: string;
  slug: string;
  categories: CategoryRecord[];
}

/**
 * Data access for the public coffee resolution. Queries are scoped by the
 * coffee's own slug; categories are loaded strictly through the `coffeeId`
 * relation so no other coffee's data can ever leak into the result.
 */
export async function findCoffeeWithCategoriesBySlug(slug: string): Promise<CoffeeWithCategoriesRecord | null> {
  const coffee = await CoffeeModel.findOne({ slug }).lean().exec();
  if (!coffee) return null;

  const categories = await ItemCategoryModel.find({ coffeeId: coffee._id })
    .sort({ name: 1 })
    .select({ name: 1, image: 1 })
    .lean()
    .exec();

  return {
    id: coffee._id.toString(),
    name: coffee.name,
    logo: coffee.logo,
    slug: coffee.slug,
    categories: categories.map((category) => ({
      id: category._id.toString(),
      name: category.name,
      image: category.image ?? null,
    })),
  };
}