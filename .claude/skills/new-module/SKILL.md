---
name: new-module
description: Scaffold a new NestJS feature module (Mongoose schema, DTOs, mapper, service, controller, module, specs) following this repo's conventions and register it in AppModule. Use when the user asks to add a new resource, entity, collection, CRUD API, or "new controller" for a new domain concept.
---

# New feature module

Scaffold a complete user-scoped CRUD feature that matches `src/entries/` (the reference implementation). Read `docs/conventions.md` first if you haven't this session.

## 1. Gather inputs

Infer these from the request. Ask only if a value is truly ambiguous:

- **Feature name** (plural, kebab-case): e.g. `sessions`, `tunnels`
- **Entity name** (singular, PascalCase): e.g. `Session`, `Tunnel`
- **Fields**: name, type, required?, constraints (min/max/enum), and whether they're filterable in list
- **User-owned?** Default yes. If no (global reference data), drop the `user` field and the user scoping, and say so explicitly.
- **Endpoints**: default `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`

## 2. Create files (in this order)

Paths are relative to `src/<feature>/`:

1. `schemas/<entity>.schema.ts`: `@Schema({ timestamps: true })`, explicit `type:` on every `@Prop`, a `user` ObjectId ref with `select: false`, string enums exported from here, and a compound index starting with `user`.
2. `dto/create-<entity>.dto.ts`: validators plus `@ApiProperty` with `description` and `example` on each field.
3. `dto/update-<entity>.dto.ts`: every field optional (`@ApiPropertyOptional` + `@IsOptional()`).
4. `dto/find-<entities>.dto.ts`: optional query filters.
5. `dto/<entity>-response.dto.ts`: `id: string` plus public fields only, with `@ApiProperty` only.
6. `mappers/<entity>.mapper.ts`: `map<Entity>ToResponse(doc)`.
7. `<feature>.service.ts`: `@InjectModel(<Entity>.name)`. Every method takes `userId` and filters by it, calls `.exec()`, throws `NotFoundException('<Entity> not found')`, and returns mapped DTOs. Create uses `{ ...dto, user: userId }`.
8. `<feature>.controller.ts`: class-level `@ApiTags`, `@ApiCookieAuth('access_token')`, `@Controller('<feature>')`, `@UseGuards(JwtAuthGuard)`. Each handler does `const user = req.user as UserDocument;` and delegates. Swagger `@ApiOperation` + `@ApiResponse` on every route.
9. `<feature>.module.ts`: `MongooseModule.forFeature([{ name: X.name, schema: XSchema }])`, controller, service, export the service.
10. `<feature>.controller.spec.ts`: mock the service and cover each handler's happy path and its 404 path. Follow `src/entries/entries.controller.spec.ts`.
11. `<feature>.service.spec.ts` (if the service has real logic): mock the model via `getModelToken(X.name)`.

## 3. Wire up

- Add `<Feature>Module` to `imports` in `src/app.module.ts`.
- Add `.overrideProvider(getModelToken(<Entity>.name)).useValue(mockModel)` in `test/app.e2e-spec.ts`, or the e2e boot will hit Mongo.
- If it introduces env vars: read them via `ConfigService`, and add them to the README env block and the CLAUDE.md env list.
- Add the module to the table in `docs/architecture.md`.

## 4. Verify

```bash
pnpm run lint && pnpm run build && pnpm exec vitest run
```

Fix every failure before reporting done. Summarize the routes you created and anything you left out.

## Rules

- Do **not** copy `importEntries`'s raw-document return. Always map.
- Never take `user`/`userId` from the request body or query.
- Use `import type { Request } from 'express'` in controllers.
- Don't put `async` on controller methods. Return the service promise.
