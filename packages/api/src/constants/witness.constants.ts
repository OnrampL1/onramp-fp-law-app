// Shared between witness.controller.ts (sets the cookie on redemption) and
// witness-session.middleware.ts (reads it on every subsequent request).
export const WITNESS_SESSION_COOKIE = "witnessAccessToken";
