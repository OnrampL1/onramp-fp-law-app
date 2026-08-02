import axios from "axios";
import type { WitnessPortalContract, WitnessRedeemResult } from "@/types/witness-portal";

// Deliberately separate from apiClient — a witness has no account, so there
// is no accessToken/refreshToken cookie for apiClient's 401-refresh
// interceptor to act on. Reusing it would add a wasted, always-failing
// round trip to /auth/refresh on every 401 this flow legitimately returns
// (e.g. "no witness session yet" on first visit).
const witnessApiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function redeemWitnessLink(token: string): Promise<WitnessRedeemResult> {
  const response = await witnessApiClient.post<{ data: WitnessRedeemResult }>(
    `/auth/witness/${token}`,
  );
  return response.data.data;
}

export async function getWitnessScopedContract(): Promise<WitnessPortalContract> {
  const response = await witnessApiClient.get<{ data: WitnessPortalContract }>(
    "/witness/contract",
  );
  return response.data.data;
}

// ─── Witness identity cache ────────────────────────────────────────────────
//
// GET /witness/contract intentionally returns only contract fields, never
// who the witness is (BR-8 scopes it to a contract-read view). The witness's
// name/email only ever come back once, in the redeem response. So a page
// reload — which skips redemption and goes straight to the scoped-read fast
// path (see useWitnessPortal) — would otherwise have nothing to show in the
// "Witness information" card. Stashing it in sessionStorage (same tab,
// cleared when the tab closes) closes that gap without changing the API:
// it degrades to a generic label if storage was cleared or this is a
// different tab, but works for the common "I refreshed my own page" case.

interface CachedWitnessIdentity {
  witnessName: string | null;
  witnessEmail: string;
  usedAt: string;
  // The invitation's contract id at redemption time — used to verify a live
  // session actually belongs to THIS token before trusting it (see the
  // fast-path guard in useWitnessPortal). Session cookies are opaque and
  // shared browser-wide, so without this check, a still-valid session from a
  // different, previously-redeemed witness link gets silently reused here
  // instead of ever redeeming the current token.
  contractId: string;
}

function identityStorageKey(token: string): string {
  return `witness-portal-identity:${token}`;
}

export function cacheWitnessIdentity(token: string, identity: CachedWitnessIdentity): void {
  try {
    sessionStorage.setItem(identityStorageKey(token), JSON.stringify(identity));
  } catch {
    // Best-effort only — private browsing / storage quota failures shouldn't
    // break the review flow, just lose the reload nicety.
  }
}

export function readCachedWitnessIdentity(token: string): CachedWitnessIdentity | null {
  try {
    const raw = sessionStorage.getItem(identityStorageKey(token));
    return raw ? (JSON.parse(raw) as CachedWitnessIdentity) : null;
  } catch {
    return null;
  }
}
