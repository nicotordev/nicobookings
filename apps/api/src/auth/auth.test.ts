import { beforeAll, describe, expect, test } from "bun:test";
import { Hono } from "hono";

const testUsername = "admin-test";
const testPassword = "correct horse battery staple";
const cookieName = "admin_session";

let app: Hono | undefined;

beforeAll(async () => {
  Bun.env.ADMIN_USERNAME = testUsername;
  Bun.env.ADMIN_PASSWORD = testPassword;
  Bun.env.JWT_SECRET = "test-only-jwt-secret-with-more-than-32-bytes";
  Bun.env.NODE_ENV = "test";

  const { authRouter, requireAdmin } = await import("./auth");
  app = new Hono();
  app.route("/api/auth", authRouter);
  app.use("/api/admin", requireAdmin);
  app.use("/api/admin/*", requireAdmin);
  app.get("/api/admin/overview", (c) => c.json({ access: "granted" }));
  app.get("/api/admin", (c) => c.json({ access: "granted" }));
});

function getApp(): Hono {
  if (!app) {
    throw new Error("Auth test app was not initialized.");
  }

  return app;
}

async function login(username: string, password: string): Promise<Response> {
  return getApp().request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

function cookieFrom(response: Response): string {
  const cookie = response.headers.get("set-cookie");

  if (!cookie) {
    throw new Error("Login response did not set a session cookie.");
  }

  return cookie.split(";")[0] ?? "";
}

describe("admin JWT authentication", () => {
  test("rejects invalid credentials without setting a cookie", async () => {
    const response = await login(testUsername, "incorrect password");

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();

    const unknownUser = await login("unknown-user", testPassword);
    expect(unknownUser.status).toBe(401);
  });

  test("rejects malformed login bodies", async () => {
    const response = await getApp().request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
  });

  test("rejects oversized login bodies", async () => {
    const response = await getApp().request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "a".repeat(5000) }),
    });

    expect(response.status).toBe(413);
  });

  test("sets a protected cookie session and serves the authenticated identity", async () => {
    const loginResponse = await login(testUsername, testPassword);

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.headers.get("set-cookie")).toContain("HttpOnly");
    expect(loginResponse.headers.get("set-cookie")).toContain("SameSite=Strict");

    const cookie = cookieFrom(loginResponse);
    const meResponse = await getApp().request("/api/auth/me", {
      headers: { Cookie: cookie },
    });

    expect(meResponse.status).toBe(200);
    expect(await meResponse.json()).toEqual({
      user: { username: testUsername, role: "admin" },
    });
  });

  test("protects admin routes and expires the cookie on logout", async () => {
    const unauthenticated = await getApp().request("/api/admin/overview");
    expect(unauthenticated.status).toBe(401);
    const unauthenticatedRoot = await getApp().request("/api/admin");
    expect(unauthenticatedRoot.status).toBe(401);

    const loginResponse = await login(testUsername, testPassword);
    const cookie = cookieFrom(loginResponse);
    const authorized = await getApp().request("/api/admin/overview", {
      headers: { Cookie: cookie },
    });
    expect(authorized.status).toBe(200);

    const logoutResponse = await getApp().request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
