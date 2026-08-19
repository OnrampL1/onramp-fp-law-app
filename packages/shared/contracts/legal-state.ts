import type { ContractLegalState } from "@prisma/client";

// The one rule for how a contract's legal lifecycle state is determined.
// TERMINATED is the sole exception: a manual, Owner/Admin-only override
// that always wins over what the dates would otherwise compute — every
// other state is derived fresh each time this runs, never picked freely
// by a user. `now` is a parameter (not read internally) so this stays a
// pure, trivially testable function.
export function deriveLegalState(
  currentLegalState: ContractLegalState | null,
  effectiveDate: Date | null,
  expirationDate: Date | null,
  now: Date = new Date(),
): ContractLegalState {
  if (currentLegalState === "TERMINATED") {
    return "TERMINATED";
  }
  if (!effectiveDate) {
    return "DRAFT";
  }
  if (now < effectiveDate) {
    return "DRAFT";
  }
  if (expirationDate && now >= expirationDate) {
    return "EXPIRED";
  }
  return "ACTIVE";
}
