/** Public API data-transfer objects. Kept independent from Mongoose documents. */

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