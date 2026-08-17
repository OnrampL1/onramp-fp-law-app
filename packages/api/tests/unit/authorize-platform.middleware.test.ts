import express from "express";
import request from "supertest";
import type { PlatformAuthUser } from "@starter-kit/shared";
import { authorizePlatform } from "../../src/middleware/authorize-platform";

function buildApp(platformUser?: PlatformAuthUser) {
  const app = express();

  app.get(
    "/platform/probe",
    (req, _res, next) => {
      if (platformUser) {
        req.platformUser = platformUser;
      }
      next();
    },
    authorizePlatform("SUPER_ADMIN"),
    (_req, res) => {
      res.json({ data: { ok: true } });
    },
  );

  app.get(
    "/platform/any",
    (req, _res, next) => {
      if (platformUser) {
        req.platformUser = platformUser;
      }
      next();
    },
    authorizePlatform(),
    (_req, res) => {
      res.json({ data: { ok: true } });
    },
  );

  return app;
}

describe("authorizePlatform", () => {
  it("returns 401 when no platform user is authenticated", async () => {
    const res = await request(buildApp()).get("/platform/probe");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthenticated");
  });

  it("allows a SUPER_ADMIN through a SUPER_ADMIN route", async () => {
    const res = await request(
      buildApp({
        id: "platform-1",
        email: "super-admin@clausio.test",
        fullName: "Super Admin",
        role: "SUPER_ADMIN",
      }),
    ).get("/platform/probe");

    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });

  it("denies SUPPORT_ENGINEER on a SUPER_ADMIN route", async () => {
    const res = await request(
      buildApp({
        id: "platform-2",
        email: "support@clausio.test",
        fullName: "Support Engineer",
        role: "SUPPORT_ENGINEER",
      }),
    ).get("/platform/probe");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Insufficient platform permissions");
  });

  it("allows any authenticated platform role when no roles are specified", async () => {
    const res = await request(
      buildApp({
        id: "platform-2",
        email: "support@clausio.test",
        fullName: "Support Engineer",
        role: "SUPPORT_ENGINEER",
      }),
    ).get("/platform/any");

    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });
});
