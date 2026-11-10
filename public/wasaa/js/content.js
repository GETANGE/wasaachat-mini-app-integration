// Storefront copy and marketing content. Edit this file to change what the
// shop says; nothing here comes from the API.
//
// Rules the UI follows so shoppers never see invented numbers:
//   - Discounts show only when a product has `compareAtPrice` above `price`.
//   - Star ratings show only when a product has `rating` (and `reviewCount`).
//   - Testimonials, the rating summary and the hero sale badge only render
//     when they're filled in below.
//   - The newsletter form only renders when `newsletter.endpoint` is set.
//
// CHECK BEFORE LAUNCH: the policy lines in `announcements` and `features`
// (delivery, returns, support hours) are promises to customers. Edit them to
// match what the business actually offers.

export const content = {
  brand: {
    name: "VIVA",
    tagline: "LIVE BETTER",
    blurb: "Your one-stop shop for quality products across every category. Live better with Viva.",
  },

  announcements: [
    { icon: "truck", text: "Free delivery on qualifying orders" },
    { icon: "returns", text: "30-day easy returns" },
    { icon: "shield", text: "Secure payments with WasaaChat" },
  ],

  // Header navigation. `goto` is a route key (see ROUTES in js/ui/router.js).
  nav: [
    { label: "Home", goto: "home" },
    { label: "Shop", goto: "shop" },
    { label: "Deals", goto: "deals" },
    { label: "New Arrivals", goto: "new" },
    { label: "Track Order", goto: "orders" },
  ],

  hero: {
    slides: [
      {
        title: "Elevate Your Everyday",
        text: "Discover quality products across every category — made for the way you live.",
        cta: { label: "Shop Now", goto: "shop" },
        // Optional wide image URL. Without one, the hero shows product photos.
        image: null,
        // Optional sale badge, e.g. { eyebrow: "Summer Sale", lead: "Up to", value: "40%", suffix: "Off" }
        badge: null,
      },
    ],
    trust: [
      { icon: "award", label: "Premium Quality" },
      { icon: "tag", label: "Great Prices" },
      { icon: "shield", label: "Secure WasaaChat Checkout" },
    ],
  },

  // Promo tiles under Top Picks. `category` is a category slug; when the shop
  // has no such category the tile links to all products. `image` is optional.
  promos: [
    { eyebrow: "New Arrivals", title: "Fresh Styles Just In", cta: "Shop Now", goto: "new", tone: "green", image: null },
    { eyebrow: "Home Refresh", title: "Make Your Space Better", cta: "Shop Now", goto: "shop", category: "home-living", tone: "sand", image: null },
    { eyebrow: "Tech Essentials", title: "Upgrade Your Lifestyle", cta: "Shop Now", goto: "shop", category: "electronics", tone: "sky", image: null },
  ],

  // Real customer quotes only: { name, rating (1–5), text, avatar?, verified? }
  testimonialsTitle: "Loved By Thousands",
  testimonials: [],
  // e.g. { value: 4.8, label: "Average Rating" } — only if it reflects real reviews.
  ratingSummary: null,

  newsletter: {
    title: "Stay in the Loop",
    text: "Get exclusive deals, new arrivals and style inspiration straight to your inbox.",
    // POST endpoint that accepts { email }. Leave null to hide the signup form.
    endpoint: null,
    note: "We respect your privacy. Unsubscribe anytime.",
  },

  // Product page. Edit to match your real delivery and returns terms.
  productPage: {
    deliveryAndReturns:
      "Orders are packed within 1 business day and delivered in 1–3 days within Nairobi, longer elsewhere. Unused items in their original packaging can be returned within 30 days.",
  },

  features: [
    { icon: "truck", title: "Free Delivery", text: "On qualifying orders" },
    { icon: "returns", title: "Easy Returns", text: "30-day return policy" },
    { icon: "shield", title: "Secure Payments", text: "Paid through WasaaChat" },
    { icon: "headset", title: "24/7 Support", text: "We're here to help" },
  ],

  footer: {
    columns: [
      {
        title: "Shop",
        links: [
          { label: "All Products", goto: "shop" },
          { label: "New Arrivals", goto: "new" },
          { label: "Deals", goto: "deals" },
        ],
      },
      {
        title: "Customer Service",
        links: [
          { label: "Track Order", goto: "orders" },
          { label: "My Cart", goto: "cart" },
          { label: "Wishlist", goto: "wishlist" },
        ],
      },
    ],
    // External links: { label, href }. Empty lists are hidden.
    company: [],
    social: [], // { network: "facebook" | "instagram" | "x" | "youtube", href }
    legal: [], // { label, href }
  },
};
