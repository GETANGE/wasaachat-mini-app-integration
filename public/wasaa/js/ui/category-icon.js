import { state } from "../state.js";
import { icon } from "./icons.js";

// Picks an icon for a category from words in its slug or name.
const RULES = [
  [/electr|tech|gadget|computer|laptop/, "monitor"],
  [/phone|audio|sound|headphone/, "headphones"],
  [/fashion|cloth|apparel|wear|dress/, "dress"],
  [/shirt|men/, "shirt"],
  [/home|living|furniture|decor|kitchen/, "sofa"],
  [/beauty|cosmetic|skin|care|health/, "bottle"],
  [/sport|fitness|outdoor|gym/, "ball"],
  [/toy|kid|baby|child/, "toy"],
  [/book|station|read/, "book"],
  [/pet|dog|cat/, "paw"],
  [/grocer|food|drink|fresh/, "basket"],
];

export function categoryIconName(category) {
  const text = `${category.slug ?? ""} ${category.name ?? ""}`.toLowerCase();
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? "tag";
}

export const categoryIcon = (category, size = 24) => icon(categoryIconName(category), size);

// Placeholder icon for a product without a photo: its category's icon.
export function productIconName(product) {
  const category = state.categories.find((c) => c.id === product.categoryId);
  return category ? categoryIconName(category) : "bag";
}
