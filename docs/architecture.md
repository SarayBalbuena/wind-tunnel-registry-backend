# Architecture

## Overview

```
            ┌──────────── Browser / Frontend (Vite :5173) ────────────┐
            │      cookie: access_token (httpOnly JWT, 1 day)          │
            └───────────────┬─────────────────────────────────────────┘
                            │ HTTPS, credentials: true (CORS allowlist)
┌───────────────────────────▼─────────────────────────────────────────┐
│ main.ts  cookieParser → CORS → ValidationPipe(whitelist,transform)  │
│          Swagger /docs                                              │
├─────────────────────────────────────────────────────────────────────┤
│ AppModule                                                           │
│  ├─ ConfigModule (global)                                           │
│  ├─ MongooseModule.forRootAsync(MONGO_URI)                          │
│  ├─ AuthModule ──imports──► UsersModule                             │
│  │    GoogleStrategy ('google'), MagicLinkStrategy ('magic-link'),     │
│  │    JwtStrategy ('jwt'), JwtAuthGuard                            │
│  ├─ EntriesModule   (Entry model)                                   │
│  └─ ReportsModule   (Entry model, read-only aggregations)           │
└───────────────────────────┬─────────────────────────────────────────┘
                            ▼
                     MongoDB: users, entries
```

## Request lifecycle (authenticated endpoint)

1. `cookie-parser` populates `req.cookies`.
2. `JwtAuthGuard` (`AuthGuard('jwt')`) runs `JwtStrategy`. It pulls the token from `req.cookies.access_token`, verifies it with `JWT_SECRET`, then `validate()` loads the user via `UsersService.findById(payload.sub)`. Unknown user → `401`.
3. Passport sets `req.user` to the full `UserDocument`.
4. The global `ValidationPipe` validates and transforms `@Body()` / `@Query()` into DTO instances. Unknown props → `400`.
5. The controller extracts `user._id.toString()` and calls the service.
6. The service queries Mongo scoped by user and maps documents to response DTOs.
7. Nest's built-in exception filter serializes `HttpException`s (`NotFoundException` → `404`).

## Authentication flow

```
GET /auth/google ──► Google consent ──► GET /auth/google/callback
                                         GoogleStrategy.validate
                                           └─ UsersService.findOrCreate(profile)
                                         AuthService.generateToken({ sub, email })
                                         Set-Cookie access_token (httpOnly; secure+SameSite=None in prod)
                                         302 → FRONTEND_URL
POST /auth/magic-link {email} ──► email link (15 min JWT, own secret, unique jti)
     ThrottlerGuard: 3 per email / 15 min, 50 total / hour → 429
GET /auth/magic-link/callback?token= ──► MagicLinkStrategy ──► same cookie as Google
     jti stored in `used_magic_links` (TTL) → each link works once
     invalid / expired / reused → MagicLinkExceptionFilter → FRONTEND_URL origin + ?error=magic_link_invalid

GET /auth/session  (JwtAuthGuard) → { authenticated, name }
GET /auth/me       (JwtAuthGuard) → user document
GET /auth/logout   → clearCookie
```

Strategies are registered by adding them to `AuthModule.providers`. The name in `PassportStrategy(Strategy, '<name>')` is what `AuthGuard('<name>')` refers to. `JwtStrategy` uses the default name `'jwt'`, which is also the `defaultStrategy`.

## Modules

| Module    | Controller routes                                      | Owns model | Exports         |
|-----------|--------------------------------------------------------|------------|-----------------|
| `auth`    | `/auth/google`, `/google/callback`, `/magic-link`, `/magic-link/callback`, `/logout`, `/session`, `/me` | none | `AuthService` |
| `users`   | none                                                   | `User`     | `UsersService`  |
| `entries` | `POST/GET /entries`, `POST /entries/import`, `PATCH/DELETE /entries/:id` | `Entry` | `EntriesService` |
| `reports` | `GET /reports/total`, `GET /reports/total-by-type`     | registers `Entry` read-only | none |

### Cross-module data access

`ReportsModule` registers `Entry` through `MongooseModule.forFeature` itself instead of importing `EntriesModule`. That's acceptable for read-only aggregations. If a module needs to **write** to another module's collection, import that module and call its exported service.

## Data model

**User** (`users`): `googleId` (unique), `email` (unique), `displayName`, `picture?`, timestamps.

**Entry** (`entries`): `user: ObjectId → User` (required, `select: false`), `type: FlightType`, `date: 'YYYY-MM-DD'` string, `minutes: 1..1440`, `note?`, timestamps. Index `{ user: 1, date: -1, type: 1 }`.

`FlightType`: `INDIVIDUAL | SHARED`. To add a value, update the enum. Swagger and validation pick it up automatically; existing reports group by whatever is stored.

Dates are stored as strings, so equality filters on `date` are exact-string matches. Range queries work because `YYYY-MM-DD` sorts lexicographically.

## Layering rules

```
Controller  ──►  Service  ──►  Mongoose Model
   │               │
   │               └─► Mapper (Document → ResponseDto)
   └─ DTOs (validation + Swagger)
```

- Controllers handle HTTP concerns only: guards, params, Swagger, pulling the user id.
- Services hold business logic and persistence. They throw Nest `HttpException`s.
- Mappers are pure functions. No DI and no I/O.
- Schemas own enums and indexes for their collection.

## Testing strategy

- **Unit** (`src/**/*.spec.ts`): controller specs with the service mocked. Service specs mock the model via `getModelToken(X.name)`.
- **E2E** (`test/*.e2e-spec.ts`): boots the real `AppModule` with `getConnectionToken()` and every model token overridden. When you add a new schema, also override its model token there or the e2e boot will try to reach Mongo.

## Deployment

The `Dockerfile` is two-stage (`node:20-alpine` builder → runtime). It copies `dist`, `node_modules` and `package.json`, then runs `CMD ["node", "dist/main"]`. Koyeb redeploys on push to `main`. Production URL and CORS origins are hard-coded in `main.ts`.

> ⚠️ `package.json`'s `start:prod` runs `dist/src/main`, but the Dockerfile runs `dist/main`. Which one is correct depends on the emitted layout: a root-level `.ts` file such as `vitest.config.ts` being compiled moves output under `dist/src/`. Check `ls dist` after `pnpm build` before touching either.

`nest-cli.json` enables the `@nestjs/swagger` CLI plugin, which infers some Swagger metadata from DTO types. The codebase still writes explicit `@ApiProperty` decorators. Keep doing that.
