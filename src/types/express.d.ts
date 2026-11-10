import type { AuthUser } from "../types/auth.ts";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      rawBody?: Buffer;
    }
  }
}

export {};
