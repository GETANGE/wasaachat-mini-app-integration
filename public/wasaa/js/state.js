// Single shared store for the app. Feature modules read and write it directly;
// rendering is triggered explicitly by the module that changes it.
export const state = {
  view: "home",
  route: "home",
  user: null,
  mode: null, // "app" (inside WasaaChat) | "web" (Sign in with WasaaChat in a browser)

  categories: [],

  // Shop listing filters
  shopMode: "all", // "all" | "deals" | "new"
  category: "",
  search: "",
  page: 1,
  totalPages: 0,
  total: 0,
  products: [],

  // Home page
  picks: null,

  cart: null,
  orders: null,
};
