// Local preview only: fakes the WasaaChat bridge and the /api backend so the
// UI can be developed in a normal browser. Loaded by js/main.js only on localhost
// with ?mock in the URL. Use ?mock=decline or ?mock=nopay to try other paths.

const mode = new URLSearchParams(location.search).get("mock") || "ok";

// What the user granted at install. ?mock=nopay simulates declining wallet.pay.
const grantedScopes = () => Object.freeze(mode === "nopay" ? ["profile.read"] : ["profile.read", "wallet.pay"]);

import { content } from "../content.js";

const img = (id, w = 600) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${w}&fit=crop&q=70`;

const categories = [
  { id: 1, name: "Electronics", slug: "electronics" },
  { id: 2, name: "Fashion", slug: "fashion" },
  { id: 3, name: "Home & Living", slug: "home-living" },
  { id: 4, name: "Beauty", slug: "beauty" },
  { id: 5, name: "Sports", slug: "sports" },
  { id: 6, name: "Toys & Kids", slug: "toys-kids" },
  { id: 7, name: "Books", slug: "books" },
  { id: 8, name: "Pet Supplies", slug: "pet-supplies" },
];

// [categoryId, name, price, compareAtPrice, rating, reviewCount, stock, imageId, description]
const products = [
  [1, "Noise Cancelling Headphones", 7999, 9999, 4.7, 1234, 18, "1505740420928-5e560c06d30e", "Over-ear wireless headphones with active noise cancelling and 30-hour battery life."],
  [2, "Linen Casual Shirt", 2999, 3999, 4.5, 812, 25, "1596755094514-f87e34085b2c", "Breathable linen-blend shirt with a relaxed fit."],
  [4, "Hydrating Face Cream", 1699, 1999, 4.6, 546, 40, "1620916566398-39f1143ab7be", "Lightweight daily moisturiser for all skin types."],
  [3, "Kenyan AA Coffee Beans 500g", 1250, null, 4.8, 963, 60, "1517668808822-9ebb02f2a0e6", "Single-origin beans from Nyeri, medium roast."],
  [5, "Urban Travel Backpack", 3999, 4999, 4.6, 1108, 12, "1553062407-98eeb64c6a62", "Water-resistant 25L backpack with a padded laptop sleeve."],
  [2, "Classic Minimal Watch", 5499, null, null, null, 9, "1523275335684-37898b6baf30", "Stainless steel case with a silicone strap."],
  [5, "Running Sneakers", 6499, 7999, 4.4, 389, 14, "1542291026-7eec264c27ff", "Lightweight knit runners with a cushioned sole."],
  [2, "Leather Top-Handle Bag", 8999, null, 4.9, 77, 6, "1584917865442-de89df76afd3", "Structured leather handbag with a detachable strap."],
  [1, "Smartwatch Series 5", 24999, 27999, 4.7, 2051, 4, "1579586337278-3befd40fd17a", "Fitness tracking, heart-rate monitoring and notifications on your wrist."],
  [3, "Velvet 3-Seater Sofa", 74999, null, 4.8, 64, 3, "1555041469-a586c61ea9bc", "Deep-seated velvet sofa with solid wood legs."],
  [3, "Tufted Accent Chair", 18999, 21999, null, null, 7, "1567538096630-e0c55bd6374c", "Button-tufted accent chair for reading corners."],
  [2, "Hard-Shell Carry-On Suitcase", 11999, 13999, 4.5, 221, 0, "1565026057447-bc90a3dceb87", "Cabin-size spinner suitcase with a TSA lock."],
].map(([categoryId, name, price, compareAt, rating, reviewCount, stock, imageId, description], index) => ({
  id: index + 1,
  categoryId,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  description,
  price: price.toFixed(2),
  compareAtPrice: compareAt ? compareAt.toFixed(2) : null,
  rating,
  reviewCount,
  stock,
  active: true,
  images: [{ url: img(imageId), alt: name }],
}));

// Sample marketing content so the preview shows every section.
// These people and quotes are made up — never ship them.
function installMockContent() {
  content.hero.slides[0].image = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1400&h=700&fit=crop&q=70";
  content.hero.slides[0].badge = { eyebrow: "Summer Sale", lead: "Up to", value: "40%", suffix: "Off" };
  content.hero.slides.push(
    { ...content.hero.slides[0], title: "Travel Light, Travel Well", text: "Carry-ons, backpacks and travel essentials for every trip.", image: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=1400&h=700&fit=crop&q=70", badge: null },
    { ...content.hero.slides[0], title: "Smarter Every Day", text: "Wearables and audio that keep up with you.", image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=1400&h=700&fit=crop&q=70", badge: null },
  );
  content.promos[0].image = img("1584917865442-de89df76afd3", 500);
  content.promos[0].category = "fashion";
  content.promos[0].goto = "shop";
  content.promos[1].image = img("1567538096630-e0c55bd6374c", 500);
  content.promos[2].image = img("1579586337278-3befd40fd17a", 500);
  content.testimonials = [
    { name: "Sarah J.", verified: true, rating: 5, text: "Amazing quality and fast delivery! Viva has become my go-to store for everything." },
    { name: "Michael T.", verified: true, rating: 5, text: "Great prices, nice selection and super easy returns. Highly recommend!" },
    { name: "Priya K.", verified: true, rating: 5, text: "I love the variety they offer. I can find everything in one place. So convenient!" },
    { name: "Daniel O.", rating: 4, text: "Paying through WasaaChat took seconds. My order arrived the next day." },
  ];
  content.ratingSummary = { value: 4.8, label: "Average Rating" };
  content.newsletter.endpoint = "/api/newsletter";
}

const cart = new Map();
const orders = [];
const intents = new Map();

const money = (n) => n.toFixed(2);
const shipping = (subtotal) => (subtotal <= 0 ? 0 : subtotal >= 5000 ? 0 : 500);

function cartView() {
  let subtotal = 0;
  let itemCount = 0;
  const items = [...cart.entries()].map(([productId, quantity]) => {
    const p = products.find((x) => x.id === productId);
    const line = Number(p.price) * quantity;
    subtotal += line;
    itemCount += quantity;
    return { productId, name: p.name, slug: p.slug, price: p.price, quantity, stock: p.stock, active: p.active, image: p.images[0]?.url ?? null, lineTotal: money(line) };
  });
  const fee = shipping(subtotal);
  return { id: 1, items, itemCount, subtotal: money(subtotal), shippingFee: money(fee), total: money(subtotal + fee) };
}

const ok = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const fail = (status, error) => ok({ error }, status);

async function handle(method, path, body) {
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 300));
  const url = new URL(path, location.origin);
  const parts = url.pathname.replace(/^\/api\//, "").split("/");

  // code2Session, as the real backend does it (any non-empty launch code works here).
  if (path === "/api/wasaa/session") {
    if (!body?.code) return fail(400, "code: Required");
    return ok({ user: { id: 1, name: "Amina Wanjiru" }, scopes: [...grantedScopes()], accessToken: "mock", expiresIn: 3600 });
  }
  if (parts[0] === "categories") return ok({ categories });

  if (path === "/api/newsletter") return ok({ subscribed: true }, 201);

  if (parts[0] === "products" && parts[1]) {
    const product = products.find((p) => p.slug === decodeURIComponent(parts[1]));
    return product ? ok({ product }) : fail(404, "Product not found");
  }

  if (parts[0] === "products") {
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const search = url.searchParams.get("search")?.toLowerCase();
    const cat = categories.find((c) => c.slug === url.searchParams.get("category"));
    const list = products.filter((p) => (!cat || p.categoryId === cat.id) && (!search || p.name.toLowerCase().includes(search)));
    return ok({ items: list.slice((page - 1) * limit, page * limit), page, limit, total: list.length, totalPages: Math.ceil(list.length / limit) });
  }

  if (parts[0] === "cart") {
    const productId = Number(parts[2] ?? body?.productId);
    const product = products.find((p) => p.id === productId);
    if (method === "POST") {
      const next = (cart.get(productId) ?? 0) + (body.quantity ?? 1);
      if (!product || next > product.stock) return fail(409, "Insufficient stock");
      cart.set(productId, next);
      return ok({ cart: cartView() }, 201);
    }
    if (method === "PATCH") {
      if (body.quantity > product.stock) return fail(409, "Insufficient stock");
      cart.set(productId, body.quantity);
    }
    if (method === "DELETE") cart.delete(productId);
    return ok({ cart: cartView() });
  }

  if (parts[0] === "orders") {
    if (parts[1] === "checkout") {
      const view = cartView();
      if (!view.items.length) return fail(400, "Cart is empty");
      const order = {
        id: 1000 + orders.length + 1,
        status: "pending",
        subtotal: view.subtotal,
        shippingFee: view.shippingFee,
        total: view.total,
        shippingAddress: body.shippingAddress,
        createdAt: new Date().toISOString(),
        items: view.items.map((i) => ({ productId: i.productId, productName: i.name, quantity: i.quantity, unitPrice: i.price })),
      };
      for (const i of view.items) products.find((p) => p.id === i.productId).stock -= i.quantity;
      cart.clear();
      orders.unshift(order);
      return ok({ order }, 201);
    }
    const order = orders.find((o) => o.id === Number(parts[1]));
    if (!parts[1]) return ok({ orders });
    if (!order) return fail(404, "Order not found");
    if (parts[2] === "payment") {
      if (order.status !== "pending") return fail(409, "Order is not awaiting payment");
      order.paymentReference = `order-${order.id}-${Math.random().toString(16).slice(2, 14)}`;
      return ok({ orderId: order.id, reference: order.paymentReference, amount: order.total, currency: "KES", description: `Order #${order.id}` }, 201);
    }
    if (parts[2] === "cancel") {
      if (order.status !== "pending") return fail(409, "Only pending orders can be cancelled");
      for (const i of order.items) products.find((p) => p.id === i.productId).stock += i.quantity;
      order.status = "cancelled";
      return ok({ order });
    }
    return ok({ order });
  }

  return fail(404, "Not found");
}

export function installMock() {
  installMockContent();
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const path = typeof input === "string" ? input : input.url;
    if (!path.startsWith("/api/")) return realFetch(input, init);
    return handle(init.method ?? "GET", path, init.body ? JSON.parse(init.body) : undefined);
  };

  // Same contract as WasaaChat's documented local bridge stub. No consent UI:
  // in WasaaChat the user grants permissions when installing the app.
  const bridge = {
    version: 2,
    platform: "web",
    appId: "dev-app",
    delivery: "url",
    launchCode: "dev-code",
    grantedScopes: grantedScopes(),
    ready: async () => bridge,
    can: (scope) => grantedScopes().includes(scope),
    getProfile: async () => ({ open_user_id: "dev-user", scopes: [...grantedScopes()] }),
    requestPayment: async (req) => {
      if (typeof req?.amount !== "string" || !/^\d+(\.\d{1,2})?$/.test(req.amount)) {
        throw Object.assign(new Error("invalid_request: amount must be a decimal string"), { error: "invalid_request" });
      }
      if (!grantedScopes().includes("wallet.pay")) {
        throw Object.assign(new Error("scope_not_granted"), { error: "scope_not_granted" });
      }
      const intent_id = `dev-intent-${req.reference}`;
      intents.set(intent_id, { ...req, polls: 0 });
      return { intent_id, status: "pending" };
    },
    getPayment: async (id) => {
      const intent = intents.get(id);
      intent.polls += 1;
      if (intent.polls < 2) return { intent_id: id, status: "pending" };
      if (intent.polls < 3) return { intent_id: id, status: "confirmed" };
      if (mode === "decline") return { intent_id: id, status: "declined" };
      const order = orders.find((o) => o.paymentReference === intent.reference);
      if (order) order.status = "paid";
      return { intent_id: id, status: "paid" };
    },
    close: async () => {
      console.info("[mock] wasaa.close() — WasaaChat would close the mini-app here");
      return { closed: true };
    },
  };

  console.info(`[mock] WasaaChat bridge and API mocked (mode: ${mode})`);
  return bridge;
}
