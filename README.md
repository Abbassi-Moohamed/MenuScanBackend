# MENU SCAN — Backend API

Production-ready REST API for **MENU SCAN**, a QR-based digital menu platform that serves
many independent coffee shops. Each coffee exposes its own public menu
(`https://menuscan.vercel.app/:coffeeSlug`) backed by this API.

```text
Coffee (1) ──── (N) ItemCategory (1) ──── (N) Item
```

- **Node.js 22 (LTS)** · **Express 5** · **TypeScript** (strict) · **MongoDB** · **Mongoose 9**
- **Zod** request validation · centralized error handling · strict CORS · helmet security headers
- Versioned public API (`/api/v1/...`) · health endpoints · versioned DB migrations · dev seed · test suite

---

## Requirements

- Node.js 22 LTS (pinned in `package.json` `engines`; matched with `@types/node@22`)
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
├── auth/            # PIN hashing (node:crypto scrypt) + admin JWT issue/verify
├── controllers/     # Thin HTTP layer: parse req, call service, respond
├── routes/          # Centralized mounting: /api/v1/... (+ admin sub-routers)
├── services/        # Business logic, not-found semantics, DTO shaping
├── repositories/    # All MongoDB queries live here (isolated from HTTP)
├── models/          # Mongoose schemas: Coffee, ItemCategory, Item
├── middlewares/     # Validation, auth (requireAdmin/*), error handler, 404
├── validators/      # Zod schemas per resource (public + admin)
├── types/           # Public/admin DTOs + Express request augmentation
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
| `APP_ADMIN_PIN` | — | `3219` | Static 4-digit PIN for the MENU SCAN **application admin** (MVP gate, not real auth) |
| `ADMIN_SECRET` | yes (prod) | dev value | Secret signing the short-lived admin bearer tokens (HS256). The dev default is **refused** when `NODE_ENV=production`. |
| `ADMIN_TOKEN_TTL` | — | `12h` | Admin token lifetime in jsonwebtoken notation (`12h`, `1d`, …) |

> `cors` options: `"*"` is only honored in `development`/`test`; the app refuses to boot with
> `NODE_ENV=production` and a wildcard CORS origin. Production requires explicit origins.

### Deploying (Render / Node hosts)

- The build needs the devDependencies (they contain TypeScript itself and `@types/node`).
  Render and similar hosts set `NODE_ENV=production` during builds, which makes `npm install`
  / `npm ci` skip devDependencies. The included `.npmrc` (`include=dev`) overrides that.
  Recommended Render **build command**: `npm ci && npm run build`.
  Start command: `npm start` → `node dist/server.js`.
- Node is pinned to `22.x` (LTS) in `engines`; Render resolves it from `package.json` and does
  not need the version set manually.
- Set these in the host's environment (never in git): `DATABASE_URL` (must include the
  database name), `ADMIN_SECRET` (≥ 16 chars — required in production), `APP_ADMIN_PIN`,
  `FRONTEND_URL`, optional `CORS_ORIGINS`.
- If the host has no health-check config yet, point it at `/health` (liveness) or
  `/health/ready` (includes a MongoDB readiness check).

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
Every seeded coffee uses the default coffee-admin PIN **`0000`** (stored as an scrypt hash).

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

> **Quick reference:** the full route map (every endpoint, auth requirement, example and
> validation rule) lives in [`ROUTES.md`](./ROUTES.md).

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

Status codes used: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`,
`403 Forbidden`, `404 Not Found`, `409 Conflict`, `413 Payload Too Large`, `500 Internal Server Error`.

---

### `GET /`

API overview — what this server is and where its endpoints live. Handy when opening the
API root (`http://localhost:4000/`) in a browser.

```json
{
  "success": true,
  "data": {
    "name": "MENU SCAN API",
    "apiVersion": "v1",
    "endpoints": {
      "health": "/health",
      "readiness": "/health/ready",
      "coffeeBySlug": "/api/v1/coffees/:coffeeSlug",
      "itemsByCategory": "/api/v1/categories/:categoryId/items"
    }
  }
}
```

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
categories. This is the endpoint the frontend calls after extracting `coffeeSlug`
from `https://menuscan.vercel.app/:coffeeSlug`.

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

## Backoffice (admin APIs)

MENU SCAN has a lightweight backoffice with two administrator levels. **There is no full
authentication system** — the MVP uses a 4-digit PIN gate that issues a **short-lived signed
bearer token**. This is a gate, not authentication; replace it before production.

```text
MENU SCAN App Admin       → manages ALL coffees (create / view / update / delete / reset PINs)
Coffee Admin (own coffee) → manages ONLY their coffee's info, categories and items
```

### PIN rules

- **App admin PIN** is static and configured via `APP_ADMIN_PIN` (default `3219`). It is
  compared in constant time; it is never stored.
- **Coffee PIN** belongs to a single coffee. Every new coffee starts at `0000`.
- Coffee PINs are stored as **one-way scrypt hashes** (`node:crypto`, per-value salt) in
  `Coffee.adminPinHash`. The plain PIN or the hash are **never** returned by any endpoint.
- A coffee admin can change their own PIN (`PATCH /api/v1/admin/my-coffee/pin`); the app admin
  can reset any coffee back to `0000` (`PATCH /api/v1/admin/coffees/:coffeeId/pin`).
- All PINs are validated as **exactly 4 decimal digits**.

### Authorization model

1. `POST /api/v1/admin/auth/app` — verify the app-admin PIN → `APP_ADMIN` token.
2. `POST /api/v1/admin/auth/coffee/:coffeeSlug` — verify that coffee's PIN → `COFFEE_ADMIN`
   token carrying the owned `coffeeId`.
3. Protected routes read `Authorization: Bearer <token>`; the token expires after
   `ADMIN_TOKEN_TTL`.
4. **Ownership is enforced server-side.** A coffee admin can only ever touch rows whose
   `item → itemCategory → coffee` chain resolves to their own `coffeeId`. Supplying another
   coffee's ObjectId returns `404`, never an extra admin surface. A `coffeeId` from the
   frontend/body is never trusted — the target's real ownership is re-validated on every query.
5. Role boundaries: coffee-admin tokens are rejected (`403`) on app-admin routes and vice-versa.

### Auth endpoints

#### `POST /api/v1/admin/auth/app`

```http
POST /api/v1/admin/auth/app
Content-Type: application/json

{ "pin": "3219" }
```

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "role": "APP_ADMIN",
    "expiresIn": "12h"
  }
}
```

#### `POST /api/v1/admin/auth/coffee/:coffeeSlug`

```http
POST /api/v1/admin/auth/coffee/cafe-el-manzah
Content-Type: application/json

{ "pin": "0000" }
```

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "role": "COFFEE_ADMIN",
    "coffeeId": "6aa5df5707f936c6faa35ca5",
    "expiresIn": "12h"
  }
}
```

Errors: `401 Unauthorized` (missing/invalid/expired token) or `401 Invalid PIN` (wrong PIN),
`404 Coffee not found`, `400 Validation failed`. All routes below require
`Authorization: Bearer <token>`.

### Application admin — coffees (all of them)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/admin/coffees` | List every coffee (with `categoryCount`) |
| `POST` | `/api/v1/admin/coffees` | Create a coffee (default PIN `0000`, hashed) |
| `GET` | `/api/v1/admin/coffees/:coffeeId` | Get one coffee |
| `PATCH` | `/api/v1/admin/coffees/:coffeeId` | Update name / logo / slug |
| `PATCH` | `/api/v1/admin/coffees/:coffeeId/pin` | Reset that coffee's admin PIN to `0000` |
| `DELETE` | `/api/v1/admin/coffees/:coffeeId` | Delete coffee + cascade categories → items |

`POST` body: `{ "name": "…" (required), "logo": "https://…" (required), "slug": "…" (optional) }`.
If `slug` is omitted it is auto-generated from the name (`Café Ternat` → `cafe-ternat`),
deduplicated with a numeric suffix if needed.

```json
{
  "success": true,
  "data": {
    "id": "6aa5df5707f936c6faa35ca5",
    "name": "Café Ternat",
    "logo": "https://example.com/ternat-logo.png",
    "slug": "cafe-ternat",
    "categoryCount": 0,
    "createdAt": "2026-09-13T00:29:04.522Z",
    "updatedAt": "2026-09-13T00:29:04.522Z"
  }
}
```

Errors: `401` no/invalid token, `403` coffee admin, `404` unknown coffee, `409` slug taken,
`400` validation.

### Coffee admin — own coffee (`/api/v1/admin/my-coffee`)

The working coffee is the one bound to the token. **No request input can retarget these
routes to another coffee.**

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/admin/my-coffee` | Own coffee info (same DTO as above) |
| `PATCH` | `/api/v1/admin/my-coffee` | Update own name / logo / slug |
| `PATCH` | `/api/v1/admin/my-coffee/pin` | Change own PIN: `{ "currentPin", "newPin" }` |
| `GET` | `/api/v1/admin/my-coffee/categories` | List own categories |
| `POST` | `/api/v1/admin/my-coffee/categories` | Create category `{ "name" }` |
| `PATCH` | `/api/v1/admin/my-coffee/categories/:categoryId` | Rename own category |
| `DELETE` | `/api/v1/admin/my-coffee/categories/:categoryId` | Delete own category (cascades its items) |
| `GET` | `/api/v1/admin/my-coffee/categories/:categoryId/items` | List items of own category |
| `POST` | `/api/v1/admin/my-coffee/categories/:categoryId/items` | Create item in own category |
| `PATCH` | `/api/v1/admin/my-coffee/items/:itemId` | Update own item |
| `DELETE` | `/api/v1/admin/my-coffee/items/:itemId` | Delete own item |

`POST /categories` body: `{ "name": "…" }`. Item bodies:
`{ "name", "description"?, "price" (≥ 0), "image"? }` — on `PATCH` every field is optional but at
least one must be provided. `PATCH /my-coffee/pin` requires `currentPin` and `newPin`, both exactly
4 digits and different.

**Ownership behavior:** targeting a `categoryId` / `itemId` that belongs to *another* coffee
returns `404 Category not found` / `404 Item not found`, and the other coffee's data is never
modified.

### Deletion strategy (no orphans)

Coffee and category deletes are dependency-ordered cascades:

```text
DELETE Coffee   → delete its items → delete its categories → delete the coffee
DELETE Category → delete its items → delete the category
```

Rows are removed children-first so a partially-failed run can never leave items orphaned under a
surviving category. On a replica-set deployment the same ordered deletes should run inside a
multi-document transaction; the standalone dev MongoDB does not support transactions, so the
deterministic order is the safety mechanism.

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

1. Create a new file `src/db/migrations/0003_....ts` implementing `{ name, up, down? }`.
2. Register it by importing it in `src/db/migrate.ts` (each file pushes itself onto the
   managed `migrations` array in `src/db/migrations/index.ts`).
3. Run `npm run db:migrate`.

Rules: never rename, reorder or edit an already-applied migration; append new ones at the end.

### Indexes and validators created

| Migration | What it does |
| --- | --- |
| `0001_init` | Creates the three collections with `$jsonSchema` validators + unique indexes (`coffees.slug`, `itemcategories (coffeeId, name)`) |
| `0002_admin` | `collMod` on `coffees`: adds the nullable `adminPinHash` field to the validator |

Tables below describe the `0001_init` indexes:

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
- **PINs**: coffee PINs are stored only as one-way `node:crypto` **scrypt** hashes with per-value
  salt and time-safe comparison; the app-admin PIN is compared in constant time and never stored.
- **Admin tokens**: short-lived HS256 bearer tokens (secret `ADMIN_SECRET`, issuer-bound, expiry
  `ADMIN_TOKEN_TTL`). Wrong/missing/expired tokens fail with `401`.
- **Ownership**: coffee admins are scoped to one `coffeeId` embedded in their token; every
  category/item operation re-validates the `item → itemCategory → coffee` chain server-side.

## Not included

Not built yet (by design for this version): customer accounts or authentication, cart,
checkout, payments, orders, reviews, loyalty, analytics, notifications, and any admin roles
beyond the two listed above. The layered `repositories → services → controllers` structure
means these can all plug in later without touching the existing public/admin architecture.