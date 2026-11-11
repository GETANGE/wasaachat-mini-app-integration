export type AuthUser = {
  id: number;
  role: "customer" | "admin";
  // How they signed in: "app" = launch code inside WasaaChat, "web" = Sign in with WasaaChat.
  kind?: "app" | "web";
};
