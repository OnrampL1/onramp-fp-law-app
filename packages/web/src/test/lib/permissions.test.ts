import { describe, it, expect } from "vitest";
import { isAdminRole } from "../../lib/permissions";

describe("isAdminRole", () => {
  it("treats OWNER as admin", () => {
    expect(isAdminRole("OWNER")).toBe(true);
  });

  it("treats ADMIN as admin", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
  });

  it("does not treat INTERNAL as admin", () => {
    expect(isAdminRole("INTERNAL")).toBe(false);
  });

  it("does not treat undefined as admin", () => {
    expect(isAdminRole(undefined)).toBe(false);
  });

  it("is case-sensitive — lowercase 'admin' is not a valid backend role", () => {
    // Regression guard for the original bug: UserManagement.tsx used to
    // compare currentUser.role === "admin", which never matched the
    // backend's uppercase "ADMIN" enum value.
    expect(isAdminRole("admin")).toBe(false);
  });
});
