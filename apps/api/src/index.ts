
import 'dotenv/config';
import { Hono } from "hono";
import { authRouter, requireAdmin } from "./auth/auth.js";
import { agentRouter } from "./agent/agent.router.js";

const app = new Hono();

app.get("/api/health", (c) => c.json({ status: "ok" }));
app.route("/api/auth", authRouter);
app.use("/api/admin", requireAdmin);
app.use("/api/admin/*", requireAdmin);
app.route("/api/agent", agentRouter);

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3001),
  fetch: app.fetch,
});

console.log(`API listening on http://localhost:${server.port}`);