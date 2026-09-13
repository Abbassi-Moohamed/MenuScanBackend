/**
 * API data-transfer objects and request input shapes. Kept independent from
 * Mongoose documents.
 */

export interface CategoryDto {
  id: string;
  name: string;
}

export interface CoffeeWithCategoriesDto {
  id: string;
  name: string;
  logo: string;
  slug: string;
  categories: CategoryDto[];
}

export interface ItemDto {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
}

/** The two administrator levels of the MENU SCAN backoffice. */
export type AdminRole = "APP_ADMIN" | "COFFEE_ADMIN";

/**
 * Authorization context attached to a request by the auth middleware after a
 * valid bearer token is verified. For COFFEE_ADMIN it always carries the id
 * of the single coffee the admin is allowed to manage — never trust a body
 * `coffeeId` past this point.
 */
export interface AdminContext {
  role: AdminRole;
  coffeeId?: string;
}

export interface AdminAuthDto {
  token: string;
  role: AdminRole;
  /** Present only for COFFEE_ADMIN sessions. */
  coffeeId?: string;
  /** Token lifetime in jsonwebtoken notation (e.g. "12h"). */
  expiresIn: string;
}

export interface AdminCoffeeDto {
  id: string;
  name: string;
  logo: string;
  slug: string;
  categoryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminCategoryDto {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminItemDto {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  itemCategoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Request body shape shared by the app-admin and coffee-admin coffee edits. */
export interface CoffeeUpdateInput {
  name?: string;
  logo?: string;
  slug?: string;
}