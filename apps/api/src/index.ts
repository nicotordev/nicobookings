
import 'dotenv/config';
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRouter } from "./auth/auth.js";
import { agentRouter } from "./agent/agent.router.js";
import { adminRouter } from "./admin/admin.router.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (
        !origin ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return origin || "*";
      }
      return origin;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/api/health", (c) => c.json({ status: "ok" }));
app.route("/api/auth", authRouter);
app.route("/api/admin", adminRouter);
app.route("/api/agent", agentRouter);

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3001),
  fetch: app.fetch,
});

console.log(`API listening on http://localhost:${server.port}`);