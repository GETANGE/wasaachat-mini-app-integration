import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index.ts";
import oauthRoutes from "./routes/oauth.routes.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import { apiRateLimiter } from "./middleware/rateLimiter.ts";
import { requestLogger } from "./middleware/requestLogger.ts";

const app = express();

app.use(requestLogger);
app.use(helmet({ frameguard: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// The web UI lives under /wasaa/ (its CSP and relative asset paths depend on
// that prefix), so the root just sends visitors there.
app.get("/", (_req, res) => {
  res.redirect(302, "/wasaa/");
});

// Privacy policy (registered as the app's privacy_policy_url in WasaaChat).
app.get("/privacy", (_req, res) => {
  res.redirect(302, "/wasaa/privacy.html");
});

app.use("/api", apiRateLimiter, routes);
app.use("/auth", oauthRoutes);
app.use(
  "/wasaa",
  (_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' https://wasaachat.com; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'self' https://wasaachat.com",
    );
    res.removeHeader("X-Frame-Options");
    next();
  },
  express.static("public/wasaa"),
);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

export default app;
