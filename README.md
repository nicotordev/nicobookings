# nicobookings

This repository contains two Bun workspaces:

- `apps/api`: Hono API and Prisma/PostgreSQL, served by Bun on port `3001`.
- `apps/frontend`: Vite frontend on port `5173`, with `/api` proxied to the API.

Install dependencies from the repository root:

```bash
bun install
```

Run both workspaces in development:

```bash
bun run dev
```

You can also start either workspace independently with `bun run dev:api` or
`bun run dev:frontend`. The API health endpoint is available at
`http://localhost:3001/api/health` (or through the frontend at
`http://localhost:5173/api/health`).

Build the frontend with `bun run build`.

Prisma's schema, configuration, and commands live in `apps/api`. Copy
`apps/api/.env.example` to `apps/api/.env`, then run database commands from the
repository root with `bun run --filter @nicobookings/api db:generate`,
`db:validate`, or `db:migrate`.
