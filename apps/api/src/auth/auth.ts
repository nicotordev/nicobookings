import { deleteCookie, setCookie } from "hono/cookie";
import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { jwt, sign, type JwtVariables } from "hono/jwt";

const adminUsername = Bun.env.ADMIN_USERNAME;
const adminPassword = Bun.env.ADMIN_PASSWORD;
const jwtSecret = Bun.env.JWT_SECRET;

if (!adminUsername || !adminPassword || !jwtSecret) {
  throw new Error(
    "ADMIN_USERNAME, ADMIN_PASSWORD, and JWT_SECRET must be configured.",
  );
}

const sessionCookie = "admin_session";
const sessionDurationSeconds = 60 * 60;
const issuer = "nicobookings-api";
const audience = "nicobookings-admin";
const isProduction = Bun.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "Strict" as const,
  path: "/",
  maxAge: sessionDurationSeconds,
};

export const requireAdmin: MiddlewareHandler<{ Variables: JwtVariables }> = jwt({
  secret: jwtSecret,
  alg: "HS256",
  cookie: sessionCookie,
  verification: { iss: issuer, aud: audience },
});

export const authRouter = new Hono<{ Variables: JwtVariables }>();

authRouter.use("/login", bodyLimit({ maxSize: 4096 }));

authRouter.post("/login", async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body." }, 400);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("username" in body) ||
    !("password" in body) ||
    typeof body.username !== "string" ||
    typeof body.password !== "string" ||
    body.username.length === 0 ||
    body.username.length > 128 ||
    body.password.length === 0 ||
    body.password.length > 1024
  ) {
    return c.json({ error: "Username and password are required." }, 400);
  }

  const passwordMatches = body.password === adminPassword;

  if (body.username !== adminUsername || !passwordMatches) {
    return c.json({ error: "Invalid username or password." }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    {
      sub: adminUsername,
      username: adminUsername,
      role: "admin",
      iss: issuer,
      aud: audience,
      iat: now,
      exp: now + sessionDurationSeconds,
    },
    jwtSecret,
    "HS256",
  );

  setCookie(c, sessionCookie, token, cookieOptions);
  c.header("Cache-Control", "no-store");

  return c.json({ user: { username: adminUsername, role: "admin" } });
});

authRouter.get("/me", requireAdmin, (c) => {
  const payload = c.get("jwtPayload");
  c.header("Cache-Control", "no-store");
  return c.json({
    user: { username: payload.username, role: payload.role },
  });
});

authRouter.post("/logout", (c) => {
  deleteCookie(c, sessionCookie, {
    ...cookieOptions,
    maxAge: 0,
  });
  c.header("Cache-Control", "no-store");
  return c.json({ success: true });
});
