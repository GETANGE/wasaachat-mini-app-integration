import jwt from "jsonwebtoken";
import { UnauthorizedError } from "./errors.ts";

export type TokenPayload = {
  uid: number;
  role: "customer" | "admin";
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

// expiresInSeconds lets a session end exactly when the WasaaChat bridge session does.
export function signToken(payload: TokenPayload, expiresInSeconds?: number): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: (expiresInSeconds ??
      process.env.JWT_ACCESS_EXPIRES_IN ??
      "15m") as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): TokenPayload {
  let decoded: string | jwt.JwtPayload;

  try {
    decoded = jwt.verify(token, getSecret());
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }

  if (
    typeof decoded === "string" ||
    typeof decoded.uid !== "number" ||
    (decoded.role !== "customer" && decoded.role !== "admin")
  ) {
    throw new UnauthorizedError("Invalid token payload");
  }

  return { uid: decoded.uid, role: decoded.role };
}
