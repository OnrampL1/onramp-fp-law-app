import rateLimit from "express-rate-limit";

// General backstop for the whole API, not a normal-usage tripwire — the
// access token is short-lived (15 min, see auth.controller.ts) and Contract
// Details polls every 4s while extraction is pending (useContractDetail.ts),
// so a couple of contracts processing at once can legitimately generate
// hundreds of requests/min from one signed-in user. 100 req/15min per IP
// used to be low enough that routine polling could exhaust it, which then
// blocked /auth/refresh and /auth/me too (mounted under the same "/api/"
// prefix) — a user got silently logged out and then couldn't even log back
// in, since /auth/login shares this same IP-keyed bucket. Session-continuity
// endpoints are exempted outright below; everything else gets a much wider,
// fast-recovering ceiling that still catches a genuinely runaway client.
export const rateLimiter = rateLimit({
  windowMs: 60 * 1_000, // 1 minute
  max: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.path === "/auth/refresh" || req.path === "/auth/me",
  message: { error: "Too many requests, please try again later." },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  max: 10, // stricter limit for auth endpoints
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
});

// Separate bucket from authRateLimiter: a witness has no User row and a
// different session mechanism entirely (see witness-session.middleware.ts),
// and is reached by people outside the organization. Sharing one IP-keyed
// bucket with staff login meant testing/using a witness link could exhaust
// the same budget and lock the organization's own team out of signing in.
export const witnessRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many attempts, please try again later.",
  },
});

export const accessRequestRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1_000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many access requests, please try again later.",
  },
});
