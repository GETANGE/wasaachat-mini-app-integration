import { ConflictError, NotFoundError } from "../utils/errors.ts";
import { fromCents, shippingFor, toCents } from "../utils/money.ts";
import * as cartRepository from "../repositories/cart.repository.ts";
import * as productRepository from "../repositories/product.repository.ts";

async function getOrCreateCart(userId: number) {
  const existing = await cartRepository.findByUserId(userId);

  if (existing) {
    return existing.id;
  }

  return cartRepository.createCart(userId);
}

export async function getCart(userId: number) {
  const cartId = await getOrCreateCart(userId);
  const rows = await cartRepository.findItems(cartId);

  const imageMap = new Map<number, string>();

  if (rows.length > 0) {
    const images = await productRepository.findImages(
      rows.map((row) => row.productId),
    );

    for (const image of images) {
      if (!imageMap.has(image.productId)) {
        imageMap.set(image.productId, image.url);
      }
    }
  }

  let subtotalCents = 0;
  let itemCount = 0;

  const items = rows.map((row) => {
    const unitCents = toCents(row.price);
    const lineTotalCents = unitCents * row.quantity;
    subtotalCents += lineTotalCents;
    itemCount += row.quantity;

    return {
      productId: row.productId,
      name: row.name,
      slug: row.slug,
      price: row.price,
      quantity: row.quantity,
      stock: row.stock,
      active: row.active,
      image: imageMap.get(row.productId) ?? null,
      lineTotal: fromCents(lineTotalCents),
    };
  });

  const shippingFeeCents = shippingFor(subtotalCents);

  return {
    id: cartId,
    items,
    itemCount,
    subtotal: fromCents(subtotalCents),
    shippingFee: fromCents(shippingFeeCents),
    total: fromCents(subtotalCents + shippingFeeCents),
  };
}

export async function addCartItem(
  userId: number,
  productId: number,
  quantity: number,
) {
  const product = await productRepository.findById(productId);

  if (!product || !product.active) {
    throw new NotFoundError("Product is not available");
  }

  const cartId = await getOrCreateCart(userId);
  const existing = await cartRepository.findItem(cartId, productId);
  const newQuantity = (existing?.quantity ?? 0) + quantity;

  if (newQuantity > product.stock) {
    throw new ConflictError("Insufficient stock");
  }

  if (existing) {
    await cartRepository.updateItemQuantity(existing.id, newQuantity);
  } else {
    await cartRepository.insertItem({ cartId, productId, quantity });
  }

  return getCart(userId);
}

export async function updateCartItem(
  userId: number,
  productId: number,
  quantity: number,
) {
  const cartId = await getOrCreateCart(userId);
  const existing = await cartRepository.findItem(cartId, productId);

  if (!existing) {
    throw new NotFoundError("Item is not in the cart");
  }

  const product = await productRepository.findById(productId);

  if (!product || quantity > product.stock) {
    throw new ConflictError("Insufficient stock");
  }

  await cartRepository.updateItemQuantity(existing.id, quantity);

  return getCart(userId);
}

export async function removeCartItem(userId: number, productId: number) {
  const cartId = await getOrCreateCart(userId);
  const affectedRows = await cartRepository.deleteItem(cartId, productId);

  if (affectedRows === 0) {
    throw new NotFoundError("Item is not in the cart");
  }

  return getCart(userId);
}
