---
name: new-endpoint
description: Add a new route to an existing NestJS controller in this repo (controller handler + service method + DTOs + Swagger + tests). Use when the user asks for a new endpoint, route, API method, filter, or query param on an existing module like entries, reports or auth.
---

# Add an endpoint to an existing module

## Steps

1. **Read the target module** first: the controller, service, DTOs and spec. Match the local style exactly, because each module has small differences.
2. **Design the contract**:
   - Verb and path. Keep it REST-ish and consistent with siblings, e.g. `GET /entries/:id` or `GET /reports/monthly`.
   - Input DTO. Body → `dto/<action>-<entity>.dto.ts`. Query → `dto/find-<...>.dto.ts`, or extend the existing find DTO.
   - Output. Reuse the existing response DTO, or create `dto/<name>-response.dto.ts` / `dto/<name>.dto.ts` (reports style).
3. **Service method**:
   - Signature `(id?, userId, dto?)`. Scope every query by `user: userId`. In aggregations use `new Types.ObjectId(userId)`.
   - `.exec()` on queries, `NotFoundException` on a miss, return mapped DTOs.
4. **Controller handler**:
   ```ts
   @Get(':id')
   @ApiOperation({ summary: '...' })
   @ApiResponse({ status: 200, type: XResponseDto })
   @ApiResponse({ status: 404, description: 'X not found' })
   findOne(@Param('id') id: string, @Req() req: Request) {
     const user = req.user as UserDocument;
     return this.service.findOne(id, user._id.toString());
   }
   ```
   - Query params: use a DTO with `@Query() query: FindXDto` (validated) plus matching `@ApiQuery` decorators. Avoid raw `@Query('name')` for new code, because those values skip validation.
   - **Route order matters**: static paths (`/import`, `/stats`) must be declared before `/:id` handlers that use the same verb.
   - Mark public routes deliberately. If the class is guarded, a public route belongs in a different controller.
5. **Tests**: add a `describe('<handler>')` block to the controller spec (mock the new service method in the mock object) covering success and error. Add service spec cases if the logic is non-trivial.
6. **Verify**: `pnpm run lint && pnpm run build && pnpm exec vitest run`.
7. Report the new route, its request/response shape and its status codes.
