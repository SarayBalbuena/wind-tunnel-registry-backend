# Code conventions

These are the patterns the existing code follows (`src/entries` is the reference implementation). New code should look like it was written by the same person.

## Feature module layout

```
src/<feature>/
  <feature>.module.ts
  <feature>.controller.ts
  <feature>.controller.spec.ts
  <feature>.service.ts
  <feature>.service.spec.ts        (recommended for non-trivial logic)
  schemas/<entity>.schema.ts
  dto/create-<entity>.dto.ts
  dto/update-<entity>.dto.ts
  dto/find-<entities>.dto.ts       (query filters)
  dto/<entity>-response.dto.ts
  mappers/<entity>.mapper.ts
```

Register the module in `src/app.module.ts` `imports`. Feature names are plural (`entries`, `reports`), entity names singular (`Entry`).

> Existing `dto/findEntries.dto.ts` is camelCase. New files use kebab-case.

## Schema

```ts
export type FooDocument = HydratedDocument<Foo>;

export enum FooKind { A = 'A', B = 'B' }        // string enums, UPPER_CASE values

@Schema({ timestamps: true })
export class Foo {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, select: false })
  user: Types.ObjectId;

  @Prop({ type: String, required: true, enum: FooKind })
  kind: FooKind;
}

export const FooSchema = SchemaFactory.createForClass(Foo);
FooSchema.index({ user: 1, /* main query fields */ });
```

- Always give `type:` explicitly in `@Prop`.
- Any user-owned document gets `user` with `select: false` and a compound index that starts with `user`.

## DTOs

- **Create**: required fields use `@ApiProperty` + validators + `@IsNotEmpty()` where it makes sense.
- **Update**: write every field out as optional (`@ApiPropertyOptional` + `@IsOptional()`). That's what the codebase does today. `PartialType` from `@nestjs/swagger` is also acceptable.
- **Find/query**: all optional. Mirror the controller's `@ApiQuery` declarations.
- **Response**: only `@ApiProperty` (no validators). Expose `id: string`, never `_id` or `user`.
- Enums: `@ApiProperty({ enum: X, enumName: 'X', example: X.A })` + `@IsEnum(X)`.
- Dates: `YYYY-MM-DD` strings with `@IsDateString()`.
- Nested arrays: `@IsArray() @ValidateNested({ each: true }) @Type(() => Child)`.

## Mapper

```ts
export function mapFooToResponse(doc: FooDocument): FooResponseDto {
  return { id: doc._id.toString(), kind: doc.kind };
}
```

Pure function, one per entity, used by every service method that returns that entity.

## Service

```ts
@Injectable()
export class FoosService {
  constructor(@InjectModel(Foo.name) private readonly fooModel: Model<FooDocument>) {}

  async update(id: string, userId: string, dto: UpdateFooDto): Promise<FooResponseDto> {
    const doc = await this.fooModel
      .findOneAndUpdate({ _id: id, user: userId }, { $set: dto },
        { returnDocument: 'after', runValidators: true })
      .exec();
    if (!doc) throw new NotFoundException('Foo not found');
    return mapFooToResponse(doc);
  }
}
```

- The signature order is `(id?, userId, dto?)`, matching `EntriesService`.
- Always call `.exec()` on queries.
- Create with `{ ...dto, user: userId }`, putting `user` **last** so a client-supplied value can't override it.
- Delete returns `{ ok: true }`.
- Aggregations: `$match: { user: new Types.ObjectId(userId) }`, and type the result with `aggregate<T>()`.

## Controller

```ts
@ApiTags('Foos')
@ApiCookieAuth('access_token')
@Controller('foos')
@UseGuards(JwtAuthGuard)
export class FoosController {
  constructor(private readonly service: FoosService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update a foo' })
  @ApiResponse({ status: 200, type: FooResponseDto })
  @ApiResponse({ status: 404, description: 'Foo not found' })
  update(@Param('id') id: string, @Body() dto: UpdateFooDto, @Req() req: Request) {
    const user = req.user as UserDocument;
    return this.service.update(id, user._id.toString(), dto);
  }
}
```

- `import type { Request } from 'express';` (type-only import, required with `isolatedModules`).
- No `async`/`await` in controllers. Return the service promise.
- Decorator order: HTTP verb → `ApiOperation` → `ApiResponse`s → `ApiQuery`s.
- Use `@Res()` only when you must set cookies or redirect (see `AuthController`), because it bypasses Nest's response handling.

## Errors

Use Nest built-ins: `NotFoundException`, `BadRequestException`, `UnauthorizedException`, `ConflictException`. Messages follow `'<Entity> not found'`.

## Tests

```ts
const mockFoosService = { create: vi.fn(), update: vi.fn() };
const mockRequest = { user: { _id: { toString: () => 'id' } } } as unknown as Request;

beforeEach(async () => {
  const app = await Test.createTestingModule({
    controllers: [FoosController],
    providers: [{ provide: FoosService, useValue: mockFoosService }],
  }).compile();
  controller = app.get(FoosController);
  vi.clearAllMocks();
});
```

- `describe('<method>')` blocks, with nested `success` / `not success` optional.
- Assert both the service call args (`toHaveBeenCalledWith('id', dto)`) and the returned value.
- Service specs: `{ provide: getModelToken(Foo.name), useValue: mockModel }` with chainable mocks (`findOneAndUpdate: vi.fn().mockReturnValue({ exec })`).
- New schema → add `.overrideProvider(getModelToken(Foo.name)).useValue(mockModel)` in `test/app.e2e-spec.ts`.

## Style

Prettier (`singleQuote`, `trailingComma: all`) and type-checked ESLint. `any` is allowed but avoid it. Floating promises warn. Run `pnpm run lint` before committing.
