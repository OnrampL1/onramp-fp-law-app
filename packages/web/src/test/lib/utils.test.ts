import { describe, it, expect } from "vitest";
import { cn } from "../../lib/utils";

describe("cn utility", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("deduplicates conflicting Tailwind classes", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("handles conditional classes", () => {
    // Deliberately hardcoded `false`, not a real condition — this
    // exercises cn()'s falsy-arg branch deterministically, which is
    // exactly what no-constant-binary-expression normally guards against
    // in application code.
    // eslint-disable-next-line no-constant-binary-expression
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });
});
