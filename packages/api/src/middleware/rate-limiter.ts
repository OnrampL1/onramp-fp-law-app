import rateLimit from "express-rate-limit";

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000, // 15 minutes
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
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
