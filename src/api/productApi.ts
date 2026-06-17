import { products } from "../data/products";
import type { Product } from "../data/products";

/**
 * Simulates a backend API call that searches products.
 * Returns matching products after a fake delay.
 */
export async function searchProducts(query: string): Promise<Product[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const lowerQuery = query.toLowerCase();

  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Simulates a backend API call that returns all categories.
 */
export async function getCategories(): Promise<string[]> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return [...new Set(products.map((p) => p.category))];
}

/**
 * Simulates a backend API call that returns products in stock.
 */
export async function getInStockProducts(): Promise<Product[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return products.filter((p) => p.stock > 0);
}
