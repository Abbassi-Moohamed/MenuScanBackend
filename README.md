# MENU SCAN — Backend API

Production-ready REST API for **MENU SCAN**, a QR-based digital menu platform that serves
many independent coffee shops. Each coffee exposes its own public menu
(`https://menuscan.vercel.app/:coffeeName`) backed by this API.

```text
Coffee (1) ──── (N) ItemCategory (1) ──── (N) Item
```

- **Node.js 24** · **Express 5** · **TypeScript** (strict) · **MongoDB** · **Mongoose 9**
- **Zod** request validation · centralized error handling · strict CORS · helmet security headers
- Versioned public API (`/api/v1/...`) · health endpoints · versioned DB migrations · dev seed · test suite

---

## Requirements

- Node.js ≥ 20.19 (built/tested on Node 24)
- A MongoDB server (local or Atlas). Anything on `mongodb://`/`mongodb+srv://` works — the
  connection is fully driven by `DATABASE_URL`.

## Stack notes

| Concern | Choice | Why |
| --- | --- | --- |
| HTTP | Express 5 | Latest stable major; async handler errors are forwarded to the error middleware natively. |
| Language | TypeScript 7 (strict, `NodeNext` ESM) | Modern config; ESM throughout including the build output. |
| Database | MongoDB via Mongoose 9 | Prisma 7 dropped MongoDB support; Prisma 6 requires replica sets for nested writes. Mongoose is the production-grade MongoDB ODM. |
| Validation | Zod 4 | Shared request schemas; malformed requests never reach the database. |
| Logging | pino + pino-http | Structured JSON in production, pretty in dev, per-request ids. |

---

## Project structure

```text
src/
├── config/          # Environment (Zod-validated) + CORS policy
├── controllers/     # Thin HTTP layer: parse req, call service, respond
├── routes/          # Centralized mounting: /api/v1/...
├── services/        # Business logic, not-found semantics, DTO shaping
├── repositories/    # All MongoDB queries live here (isolated from HTTP)
├── models/          # Mongoose schemas: Coffee, ItemCategory, Item
├── middlewares/     # Validation, centralized error handler, 404
├── validators/      # Zod schemas per resource
├── types/           # Public DTOs + Express request augmentation
├── utils/           # ApiError, logger, response envelope helpers
├── db/              # Connection, migration runner + migrations, seed
├── app.ts           # Express app factory (no I/O — fully testable)
└── server.ts        # Entry point: connect DB, listen, graceful shutdown
tests/               # Vitest + supertest integration suite (in-memory MongoDB)
```

Dependency flow is one-way and never reversed:

```text
Routes → Controllers → Services → Repositories → Mongoose models → MongoDB
```

---

## Installation & configuration

```bash
npm install
cp .env.example .env   # then edit values (see below)
```

### `.env` variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | — | `development` | `development` \| `test` \| `production` |
| `HOST` | — | `0.0.0.0` | Interface the API binds to |
| `PORT` | — | `4000` | Listening port |
| `DATABASE_URL` | yes (prod) | `mongodb://127.0.0.1:27017/menuscan` | MongoDB connection string. Local: `mongodb://127.0.0.1:27017/menuscan`. Atlas: `mongodb+srv://USER:PASSWORD@host/menuscan?retryWrites=true&w=majority` |
| `FRONTEND_URL` | — | `http://localhost:3000` | Primary CORS origin (the Next.js app) |
| `CORS_ORIGINS` | — | _(empty)_ | Extra allowed origins, comma-separated (e.g. `https://menuscan.vercel.app`) |
| `LOG_LEVEL` | — | `info` | pino level: `trace` \| `debug` \| `info` \| `warn` \| `error` \| `silent` |

> `cors` options: `"*"` is only honored in `development`/`test`; the app refuses to boot with
> `NODE_ENV=production` and a wildcard CORS origin. Production requires explicit origins.

### Database

```bash
# 1. Apply migrations (creates collections, $jsonSchema validators, indexes,
#    and records the run in the changelog collection `_migrations`)
npm run db:migrate

# 2. Seed realistic multi-coffee demo data (destructive: wipes + resets)
npm run db:seed
```

The seed creates 3 coffees — **Café El Manzah**, **Brew & Beans**, **Coffee Leaf** — each with
its own distinct categories and items. Same-named categories (e.g. `Cafés` under both
Café El Manzah and Brew & Beans) are included on purpose to prove data isolation works.

### Running

```bash
npm run dev        # tsx watch, hot reload
npm run build      # compile to dist/ (tsc, strict)
npm start          # run the production build
```

### Quality gates

```bash
npm run typecheck  # tsc --noEmit (strict)
npm test           # Vitest integration suite — runs against an in-memory MongoDB
npm run check      # typecheck + tests
```

---

## API

Base URL (local): `http://localhost:4000`

All public responses are wrapped in an envelope:

```json
{ "success": true, "data": { ... } }
```

All errors share a consistent shape and HTTP status:

```json
{ "success": false, "message": "Coffee not found" }
```

Validation failures additionally include a `details` array:

```json
{
  "success": false,
  "message": "Validation failed",
  "details": [{ "field": "params.coffeeSlug", "message": "Slug must be lowercase, ..." }]
}
```

Status codes used: `200 OK`, `201 Created`, `400 Bad Request`, `403 Forbidden`,
`404 Not Found`, `409 Conflict`, `413 Payload Too Large`, `500 Internal Server Error`.

---

### `GET /health`

Liveness probe (process is up). Useful for load balancers.

```http
GET /health
```

```json
{ "status": "ok" }
```

### `GET /health/ready`

Readiness probe — verifies the database connection.

```http
GET /health/ready
```

```json
{ "status": "ok", "database": "up" }
```

Returns `503` with `{ "status": "error", "database": "down" }` when MongoDB is unreachable.

---

### `GET /api/v1/coffees/:coffeeSlug`

Resolves a coffee by its URL-safe **slug** and returns the coffee with **only its own**
categories. This is the endpoint the frontend calls after extracting `coffeeName`
from `https://menuscan.vercel.app/:coffeeName`.

**Validation rules for `coffeeSlug`:** lowercase, 1–80 chars, letters/digits with optional
dashes between segments (`cafe-el-manzah`). Matching is case-insensitive (the slug is
normalized to lowercase before the query).

```http
GET /api/v1/coffees/cafe-el-manzah
```

```json
{
  "success": true,
  "data": {
    "id": "6aa5df5707f936c6faa35ca5",
    "name": "Café El Manzah",
    "logo": "https://picsum.photos/seed/manzah-logo/400/400",
    "slug": "cafe-el-manzah",
    "categories": [
      { "id": "6aa5df5807f936c6faa35caa", "name": "Boissons chaudes" },
      { "id": "6aa5df5707f936c6faa35ca6", "name": "Cafés" },
      { "id": "6aa5df5807f936c6faa35cb0", "name": "Desserts" },
      { "id": "6aa5df5807f936c6faa35cad", "name": "Jus" },
      { "id": "6aa5df5807f936c6faa35cb3", "name": "Petit-déjeuner" }
    ]
  }
}
```

Errors:

- `404` `Coffee not found` — the slug doesn't exist
- `400` `Validation failed` — malformed slug

---

### `GET /api/v1/categories/:categoryId/items`

Returns the items of **one specific category only**. This is the endpoint the frontend
calls when a category bubble is tapped, using the `ItemCategory.id` from the coffee payload.

**Validation rules for `categoryId`:** 24-character hex MongoDB ObjectId.

```http
GET /api/v1/categories/6aa5df5707f936c6faa35ca6/items
```

```json
{
  "success": true,
  "data": [
    {
      "id": "6aa5df5807f936c6faa35ca7",
      "name": "Café Crème",
      "description": "Espresso allongé avec un nuage de crème",
      "price": 3.0,
      "image": "https://picsum.photos/seed/manzah-creme/400/300"
    },
    {
      "id": "6aa5df5807f936c6faa35ca8",
      "name": "Cappuccino",
      "description": "Espresso, lait vapeur et mousse soyeuse",
      "price": 4.0,
      "image": "https://picsum.photos/seed/manzah-cappuccino/400/300"
    }
  ]
}
```

Items are sorted by name; `description` and `image` are `null` when absent; `price` is a number.

Errors:

- `404` `Category not found` — the id doesn't exist
- `400` `Validation failed` — malformed id

---

## Data isolation (multi-tenancy)

MENU SCAN serves unlimited independent coffee shops. The rules:

1. **A coffee only ever sees its own categories.** `GET /api/v1/coffees/:slug` loads categories
   exclusively through the `coffeeId` relation of the resolved coffee.
2. **A category only ever returns its own items.** `GET /api/v1/categories/:id/items` scopes the
   query strictly by `itemCategoryId`.
3. **Referential integrity at write time** is enforced by Mongoose refs + `(coffeeId, name)`
   unique index; **answer correctness at read time** is enforced in the repository layer — the
   HTTP/controller layer can never inject a query that crosses tenants.

Same-named categories or items across different coffees are fine and remain fully isolated
(verified by the test suite). MongoDB is schemaless, so there are no foreign keys — isolation
is enforced by the query design in `src/repositories/` and covered by integration tests in
`tests/api.test.ts`.

---

## Migrations

MongoDB has no SQL DDL, so migrations manage **collections, `$jsonSchema` validators and
indexes**. The runner in `src/db/migrate.ts` executes `src/db/migrations/*` in order and records
each applied migration in the managed `_migrations` changelog collection — each migration runs
exactly once per database.

Add a new migration:

1. Create a new file `src/db/migrations/0002_....ts` implementing `{ name, up, down? }`.
2. Register it by appending to the ordered array in `src/db/migrations/index.ts`.
3. Run `npm run db:migrate`.

Rules: never rename, reorder or edit an already-applied migration; append new ones at the end.

### Indexes created by `0001_init`

| Collection | Index | Uniqueness |
| --- | --- | --- |
| `coffees` | `{ slug: 1 }` | unique — resolves `/:coffeeSlug` |
| `itemcategories` | `{ coffeeId: 1, name: 1 }` | unique — no duplicate category names per coffee |
| `itemcategories` | `{ coffeeId: 1 }` | — |
| `items` | `{ itemCategoryId: 1 }` | — |

`autoIndex` is disabled on the driver: indexes are owned by migrations, so environments stay
consistent.

---

## Security

- **Helmet** security headers, `x-powered-by` disabled.
- **CORS** restricted to `FRONTEND_URL` (+ optional `CORS_ORIGINS`); wildcard refused in production.
- **Body limit** `10kb`, JSON parsing only.
- **Validation** (Zod) before any database access.
- **Error middleware** never leaks stack traces, credentials or internal details in responses;
  internals are written only to server logs. `DATABASE_URL` is never logged.
- Secrets live only in `.env` (git-ignored); a template ships as `.env.example`.

## Not included

No customer accounts, auth, cart, checkout, payments, orders, reviews, loyalty or admin
dashboard — by design for this version. The layered `repositories → services → controllers`
structure means an admin API can plug in later without touching the public menu architecture.