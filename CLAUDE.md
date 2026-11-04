# CLAUDE.md

NestJS 11 + MongoDB (Mongoose) backend for tracking wind tunnel flight time. Google OAuth login, JWT stored in an `access_token` httpOnly cookie, Swagger at `/docs`. Deployed to Koyeb via Docker on every push to `main`.

## Commands

```bash
pnpm install              # pnpm only (packageManager pinned in package.json)
pnpm run start:dev        # watch mode, needs .env with MONGO_URI etc.
pnpm run build            # nest build -> dist/
pnpm run lint             # eslint --fix (type-checked rules + prettier)
pnpm run format           # prettier on src/ and test/
pnpm exec vitest run      # all tests once (`pnpm test` starts watch mode locally)
pnpm exec vitest run src/entries   # tests for one module
pnpm run test:coverage
```

CI (`.github/workflows/ci.yml`) runs **lint → build → test** on PRs to `main`. Run all three before you call a change done.

## Layout

```
src/
  main.ts                 bootstrap: cookie-parser, CORS allowlist, global ValidationPipe, Swagger
  app.module.ts           ConfigModule (global), MongooseModule.forRootAsync, feature modules
  app.controller.ts       GET / -> 301 /docs
  auth/                   Google + JWT passport strategies, JwtAuthGuard, cookie login/logout/session/me
  users/                  User schema + UsersService (findOrCreate from Google profile). No controller.
  entries/                Flight entries CRUD + bulk import (schema, dtos, mapper, service, controller)
  reports/                Aggregations over the Entry collection (totals, totals by type)
test/app.e2e-spec.ts      boots AppModule with mocked Mongo connection/models
docs/                     architecture and conventions; read these before structural changes
```

## Conventions you must follow

Full detail is in `docs/conventions.md`. The short version:

- **One feature = one Nest module folder** with `schemas/`, `dto/`, `mappers/` subfolders, plus `<feature>.module|controller|service.ts` and a `<feature>.controller.spec.ts`. Kebab-case filenames.
- **Controllers stay thin.** Pull the user with `const user = req.user as UserDocument;` and pass `user._id.toString()` into the service. Never trust a user id from the body or query.
- **Authenticated controllers** use `@UseGuards(JwtAuthGuard)` + `@ApiCookieAuth('access_token')` + `@ApiTags(...)` at class level.
- **Every query is scoped by user.** Filter `{ _id: id, user: userId }` and throw `NotFoundException` when nothing matches, so a user can't tell whether another user's document exists.
- **Services return response DTOs** built by a mapper (`mapXToResponse`). Don't return raw Mongoose documents.
- **DTOs** pair `class-validator` decorators with `@ApiProperty`/`@ApiPropertyOptional`. The global ValidationPipe uses `whitelist + forbidNonWhitelisted + transform`, so any field not declared on a DTO is rejected.
- **Swagger**: every endpoint gets `@ApiOperation` and `@ApiResponse({ status, type })`.
- **Aggregations**: `$match` on `user` needs `new Types.ObjectId(userId)` because aggregate pipelines don't auto-cast. `find`/`findOne` do auto-cast.
- **Config** goes through `ConfigService` (ConfigModule is global). New env vars must be added to the README env list.
- **Tests**: Vitest (`vi.fn()`, globals enabled), with the service mocked through `{ provide: XService, useValue: mock }`. Group with `describe(method) → it(...)` and cover success plus the `NotFoundException` path.

## Gotchas

- `Entry.user` has `select: false`, so it isn't returned by `find`. Keep it out of response DTOs.
- `JWT_SECRET` / Google creds fall back to `'secret'` / `'placeholder'` when unset. Don't add more fallbacks for secrets.
- Cookie flags depend on `NODE_ENV === 'production'` (`secure`, `sameSite: 'none'`). The frontend origin must be in the CORS list in `main.ts`.
- `FlightType` enum lives in `entries/schemas/entry.schema.ts` and is reused by reports DTOs.

## Env vars

`PORT`, `MONGO_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `MAGIC_LINK_CALLBACK_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `FRONTEND_URL`, `NODE_ENV`. Never commit `.env*` files or print their values.

## Project skills and agents

- Skills (`.claude/skills/`): `new-module`, `new-endpoint`, `new-auth-strategy`, `new-report` for scaffolding; `create-pr` for opening pull requests.
- Agents (`.claude/agents/`): `nest-architect` (design/plan and architecture review), `nest-test-writer` (Vitest specs).

## Git

- Branch off `main` as `<type>/<kebab-summary>` (`feat/`, `fix/`, `chore/`, `refactor/`, `test/`). Merging to `main` deploys to production.
- Branch commits: lowercase conventional, e.g. `feat: add monthly report`. PRs are squash-merged.
- PR titles: `[TYPE] - Summary`, e.g. `[FEAT] - Redirect login to frontend`, `[FIX] - Update DTOs swagger`, `[CHORE][FEAT] - ...`.
- PR body: template's `## Context` / `## List of changes` / `# Type of change`, with the Description placeholder dropped. Use the `create-pr` skill.
