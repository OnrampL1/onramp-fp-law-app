import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { errorHandler } from "./src/middleware/error-handler";
import { rateLimiter } from "./src/middleware/rate-limiter";
import { router } from "./src/routes";

const app = express();

// ─── Trust proxy ──────────────────────────────────────────────────────────────
// Deliberately NOT set. req.ip (used for audit log ipAddress — see
// controllers that call auditService via a service's requestContext) is
// correct as-is when the API is reached directly, with no reverse
// proxy/load balancer/CDN in front of it. If this deployment DOES sit
// behind one, req.ip will report the proxy's address instead of the real
// client until `app.set('trust proxy', <hop count>)` is configured with
// the exact number of trusted hops for that topology — this repo has no
// committed infra config (nginx/ALB/CDN) to determine that from, so it
// must be confirmed against the actual deployment before being set.
// Setting it to `true` or a wrong hop count makes ipAddress spoofable via
// a forged X-Forwarded-For header.

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);

// ─── Cookie parsing ───────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use("/api/", rateLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── OpenAPI / Swagger UI ─────────────────────────────────────────────────────
const openApiSpec = yaml.load(
  fs.readFileSync(path.join(__dirname, "openapi.yaml"), "utf8"),
) as object;
app.get("/api/openapi.yaml", (_req, res) =>
  res.sendFile(path.join(__dirname, "openapi.yaml")),
);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Error handling (must be last) ────────────────────────────────────────────
app.use(errorHandler);

export { app };
