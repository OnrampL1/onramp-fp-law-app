import { deriveLegalState } from "./legal-state";

const NOW = new Date("2026-06-15T00:00:00.000Z");
const PAST = new Date("2026-01-01T00:00:00.000Z");
const FUTURE = new Date("2026-12-01T00:00:00.000Z");

describe("deriveLegalState", () => {
  it("always returns TERMINATED once set, regardless of dates", () => {
    expect(deriveLegalState("TERMINATED", PAST, FUTURE, NOW)).toBe(
      "TERMINATED",
    );
    expect(deriveLegalState("TERMINATED", null, null, NOW)).toBe(
      "TERMINATED",
    );
    expect(deriveLegalState("TERMINATED", FUTURE, null, NOW)).toBe(
      "TERMINATED",
    );
  });

  it("returns DRAFT when there is no effective date yet", () => {
    expect(deriveLegalState(null, null, null, NOW)).toBe("DRAFT");
    expect(deriveLegalState("ACTIVE", null, FUTURE, NOW)).toBe("DRAFT");
  });

  it("returns DRAFT when the effective date is still in the future", () => {
    expect(deriveLegalState(null, FUTURE, null, NOW)).toBe("DRAFT");
  });

  it("returns ACTIVE once effective and before expiration (or no expiration at all)", () => {
    expect(deriveLegalState(null, PAST, null, NOW)).toBe("ACTIVE");
    expect(deriveLegalState(null, PAST, FUTURE, NOW)).toBe("ACTIVE");
    expect(deriveLegalState(null, NOW, null, NOW)).toBe("ACTIVE"); // effective exactly now
  });

  it("returns EXPIRED once past the expiration date", () => {
    expect(deriveLegalState(null, PAST, PAST, NOW)).toBe("EXPIRED");
  });

  it("treats expiration exactly at `now` as expired (>=, not >)", () => {
    expect(deriveLegalState(null, PAST, NOW, NOW)).toBe("EXPIRED");
  });

  it("recomputes fresh from dates when the prior state was TERMINATED cleared to null (reactivate)", () => {
    // Mirrors how ContractService.setContractLegalState calls this for
    // "reactivate": the manual override is stripped (passed as null), not
    // read from the stale TERMINATED value, so the result is driven purely
    // by the dates again.
    expect(deriveLegalState(null, PAST, FUTURE, NOW)).toBe("ACTIVE");
    expect(deriveLegalState(null, FUTURE, null, NOW)).toBe("DRAFT");
    expect(deriveLegalState(null, PAST, PAST, NOW)).toBe("EXPIRED");
  });

  it("defaults `now` to the current time when not passed explicitly", () => {
    const effectiveInThePast = new Date(Date.now() - 1000);
    expect(deriveLegalState(null, effectiveInThePast, null)).toBe("ACTIVE");
  });
});
