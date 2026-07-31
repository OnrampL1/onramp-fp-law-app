import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  cacheWitnessIdentity,
  getWitnessScopedContract,
  readCachedWitnessIdentity,
  redeemWitnessLink,
} from "@/services/witness-portal.service";
import type { WitnessPortalContract } from "@/types/witness-portal";

export type WitnessPortalErrorKind = "not-found" | "expired" | "revoked" | "used" | "unknown";

export interface WitnessPortalErrorInfo {
  kind: WitnessPortalErrorKind;
  message: string;
}

export interface WitnessPortalResult {
  contract: WitnessPortalContract;
  witnessName: string | null;
  witnessEmail: string | null;
  usedAt: string | null;
}

function classifyWitnessPortalError(error: unknown): WitnessPortalErrorInfo {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const message =
      (error.response?.data as { error?: string } | undefined)?.error ??
      "Something went wrong. Please try again.";
    const lower = message.toLowerCase();

    if (status === 404) return { kind: "not-found", message };
    if (status === 410 || status === 403) {
      if (lower.includes("revoked")) return { kind: "revoked", message };
      if (lower.includes("expired")) return { kind: "expired", message };
      if (lower.includes("used")) return { kind: "used", message };
    }
  }
  return { kind: "unknown", message: "Something went wrong. Please try again." };
}

async function loadWitnessPortal(token: string): Promise<WitnessPortalResult> {
  const cached = readCachedWitnessIdentity(token);

  // Only take the "reuse the existing session" fast path if THIS browser has
  // a local record of having redeemed THIS exact token before (a reload of
  // a link already opened in this tab). Session cookies are opaque and
  // shared browser-wide, not per-token — without this guard, a still-valid
  // session from a *different*, previously-redeemed witness link would be
  // silently reused here instead of ever redeeming the current token. That
  // was a real bug: generating and opening a second witness link while an
  // earlier link's session was still valid left the second invitation stuck
  // showing "pending" in the admin table, because it was never redeemed.
  if (cached) {
    try {
      const contract = await getWitnessScopedContract();
      // Belt-and-suspenders: even with a cache hit for this token, verify the
      // *live* session actually resolves to the same contract we redeemed it
      // for — guards against the cache being stale relative to a cookie that
      // has since moved on to a different link.
      if (contract.id === cached.contractId) {
        return {
          contract,
          witnessName: cached.witnessName,
          witnessEmail: cached.witnessEmail,
          usedAt: cached.usedAt,
        };
      }
      // Live session belongs to a different invitation than this token —
      // fall through and redeem this token for real, below.
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 403) {
        // This token's own session exists but was just cut off (revoked, or
        // expired mid-session) — definitive, don't fall through to redeeming.
        throw err;
      }
      // 401 — the cached session has since expired or been superseded —
      // fall through and attempt redemption using the token from the URL.
    }
  }

  const redeemResult = await redeemWitnessLink(token);
  const usedAt = new Date().toISOString();
  cacheWitnessIdentity(token, {
    witnessName: redeemResult.witnessToken.witnessName,
    witnessEmail: redeemResult.witnessToken.witnessEmail,
    usedAt,
    contractId: redeemResult.contract.id,
  });

  const contract = await getWitnessScopedContract();
  return {
    contract,
    witnessName: redeemResult.witnessToken.witnessName,
    witnessEmail: redeemResult.witnessToken.witnessEmail,
    usedAt,
  };
}

export function useWitnessPortal(token: string | undefined) {
  const query = useQuery({
    queryKey: ["witness-portal", token],
    queryFn: () => loadWitnessPortal(token as string),
    enabled: !!token,
    retry: false,
    // Single-use token, fixed contract snapshot — nothing here changes on
    // its own; a manual "Try again" (refetch) is the only reason to reload.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    errorInfo: query.isError ? classifyWitnessPortalError(query.error) : null,
  };
}
