# nicobookings

This repository contains three Bun workspaces:

- `apps/api`: Hono API and Prisma/PostgreSQL, served by Bun on port `3001`.
- `apps/frontend`: Vite frontend on port `5173`, with `/api` proxied to the API.
- `apps/admin`: Vite administration dashboard on port `5174`, with `/api` proxied to the API.

Install dependencies from the repository root:

```bash
bun install
```

Run all three workspaces in development:

```bash
bun run dev
```

You can also start workspaces independently with `bun run dev:api`,
`bun run dev:frontend`, or `bun run dev:admin`. The API health endpoint is
available at `http://localhost:3001/api/health` (or through the frontend at
`http://localhost:5173/api/health` and the admin at
`http://localhost:5174/api/health`).

Build both Vite apps with `bun run build`.

Prisma's schema, configuration, and commands live in `apps/api`. Copy
`apps/api/.env.example` to `apps/api/.env`, then run database commands from the
repository root with `bun run --filter @nicobookings/api db:generate`,
`db:validate`, or `db:migrate`.

The admin panel uses JWT sessions in an `HttpOnly`, `SameSite=Strict` cookie.
Set `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `JWT_SECRET` in
`apps/api/.env` (also listed in `apps/api/.env.example`). Create a password hash with
`bun -e 'console.log(await Bun.password.hash("replace-with-a-strong-password"))'`
after replacing the placeholder with a strong password, and generate a JWT
secret with `openssl rand -base64 32`. The JWT secret must contain at least 32
bytes. Admin API routes under `/api/admin/*` require a valid session.
