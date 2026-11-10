import { db, pool } from "../src/config/db.ts";
import { categories, productImages, products } from "../src/models/schema.ts";
import { slugify } from "../src/utils/slug.ts";

// Starter catalog so a fresh database shows a complete storefront.
// Photos are from Unsplash; replace them with your own product shots.
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&h=800&fit=crop&q=75`;

const CATEGORIES = [
  { name: "Electronics", slug: "electronics", description: "Audio, wearables and gadgets" },
  { name: "Fashion", slug: "fashion", description: "Clothing, bags and accessories" },
  { name: "Home & Living", slug: "home-living", description: "Furniture, decor and kitchen" },
  { name: "Beauty", slug: "beauty", description: "Skincare and personal care" },
  { name: "Sports", slug: "sports", description: "Gear for training and travel" },
  { name: "Toys & Kids", slug: "toys-kids", description: "Toys, games and kids' essentials" },
  { name: "Books", slug: "books", description: "Fiction, non-fiction and stationery" },
  { name: "Pet Supplies", slug: "pet-supplies", description: "Food, toys and care for pets" },
];

type SeedProduct = {
  category: string;
  name: string;
  price: string;
  stock: number;
  sku: string;
  photo: string;
  description: string;
};

const PRODUCTS: SeedProduct[] = [
  { category: "electronics", name: "Noise Cancelling Headphones", price: "7999.00", stock: 18, sku: "EL-HP-001", photo: "1505740420928-5e560c06d30e", description: "Over-ear wireless headphones with active noise cancelling and 30-hour battery life." },
  { category: "electronics", name: "Smartwatch Series 5", price: "24999.00", stock: 4, sku: "EL-SW-005", photo: "1579586337278-3befd40fd17a", description: "Fitness tracking, heart-rate monitoring and notifications on your wrist." },
  { category: "fashion", name: "Linen Casual Shirt", price: "2999.00", stock: 25, sku: "FA-SH-010", photo: "1596755094514-f87e34085b2c", description: "Breathable linen-blend shirt with a relaxed fit." },
  { category: "fashion", name: "Classic Minimal Watch", price: "5499.00", stock: 9, sku: "FA-WA-002", photo: "1523275335684-37898b6baf30", description: "Stainless steel case with a silicone strap." },
  { category: "fashion", name: "Leather Top-Handle Bag", price: "8999.00", stock: 6, sku: "FA-BG-003", photo: "1584917865442-de89df76afd3", description: "Structured leather handbag with a detachable strap." },
  { category: "fashion", name: "Hard-Shell Carry-On Suitcase", price: "11999.00", stock: 10, sku: "FA-LG-004", photo: "1565026057447-bc90a3dceb87", description: "Cabin-size spinner suitcase with a TSA lock." },
  { category: "home-living", name: "Kenyan AA Coffee Beans 500g", price: "1250.00", stock: 60, sku: "HL-CF-001", photo: "1517668808822-9ebb02f2a0e6", description: "Single-origin beans from Nyeri, medium roast." },
  { category: "home-living", name: "Velvet 3-Seater Sofa", price: "74999.00", stock: 3, sku: "HL-SF-002", photo: "1555041469-a586c61ea9bc", description: "Deep-seated velvet sofa with solid wood legs." },
  { category: "home-living", name: "Tufted Accent Chair", price: "18999.00", stock: 7, sku: "HL-CH-003", photo: "1567538096630-e0c55bd6374c", description: "Button-tufted accent chair for reading corners." },
  { category: "beauty", name: "Hydrating Face Cream", price: "1699.00", stock: 40, sku: "BE-FC-001", photo: "1620916566398-39f1143ab7be", description: "Lightweight daily moisturiser for all skin types." },
  { category: "sports", name: "Urban Travel Backpack", price: "3999.00", stock: 12, sku: "SP-BP-001", photo: "1553062407-98eeb64c6a62", description: "Water-resistant 25L backpack with a padded laptop sleeve." },
  { category: "sports", name: "Running Sneakers", price: "6499.00", stock: 14, sku: "SP-SN-002", photo: "1542291026-7eec264c27ff", description: "Lightweight knit runners with a cushioned sole." },
];

async function seed() {
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);

  if (existing.length > 0) {
    console.log("Database already has categories, skipping seed.");
    return;
  }

  const categoryIds = new Map<string, number>();

  for (const category of CATEGORIES) {
    const [created] = await db.insert(categories).values(category).$returningId();
    categoryIds.set(category.slug, created!.id);
  }

  for (const product of PRODUCTS) {
    const [created] = await db
      .insert(products)
      .values({
        categoryId: categoryIds.get(product.category)!,
        name: product.name,
        slug: slugify(product.name),
        description: product.description,
        price: product.price,
        stock: product.stock,
        sku: product.sku,
      })
      .$returningId();

    await db.insert(productImages).values({
      productId: created!.id,
      url: photo(product.photo),
      alt: product.name,
      sortOrder: 0,
    });
  }

  console.log(`Seeded ${CATEGORIES.length} categories and ${PRODUCTS.length} products with photos.`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
