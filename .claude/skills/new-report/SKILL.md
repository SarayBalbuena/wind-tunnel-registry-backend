---
name: new-report
description: Add a new aggregation/statistics endpoint to the reports module (MongoDB aggregation pipeline over entries, response DTO, Swagger, tests). Use when the user asks for stats, totals, summaries, breakdowns, charts data, monthly/weekly reports, or any computed metrics over flight entries.
---

# New report endpoint

Reports live in `src/reports/` and run read-only aggregations over the `Entry` model.

## Steps

1. **Response DTO**: `src/reports/dto/<report-name>.dto.ts`. Use `@ApiProperty` with `description` and `example` on every field, and nested classes for arrays (see `total-flight-time-by-type.dto.ts`).
2. **Query DTO** (if there are filters): `src/reports/dto/<report-name>-query.dto.ts` with `class-validator`, e.g. `from`/`to` with `@IsDateString()` and `@IsOptional()`.
3. **Service method** in `ReportsService`:
   ```ts
   async monthlyFlightTime(userId: string, query: MonthlyQueryDto): Promise<MonthlyFlightTimeDto> {
     const match: Record<string, unknown> = { user: new Types.ObjectId(userId) }; // aggregate does NOT auto-cast
     if (query.from || query.to) match.date = { ...(query.from && { $gte: query.from }), ...(query.to && { $lte: query.to }) };

     const rows = await this.entryModel.aggregate<{ month: string; minutes: number }>([
       { $match: match },
       { $group: { _id: { $substrBytes: ['$date', 0, 7] }, minutes: { $sum: '$minutes' } } },
       { $project: { _id: 0, month: '$_id', minutes: 1 } },
       { $sort: { month: 1 } },
     ]);
     return { totalMinutes: rows.reduce((a, r) => a + r.minutes, 0), months: rows };
   }
   ```
   - `date` is a `YYYY-MM-DD` **string**, so string ops (`$substrBytes`) and lexicographic `$gte`/`$lte` work. `$dateTrunc` does **not** work without `$dateFromString`.
   - `$match` on `user` must come first so the `{ user, date, type }` index is used.
   - Always return a well-formed empty result (zeros, empty arrays) when there's no data.
4. **Controller handler** in `ReportsController`: `@Get('<kebab-path>')`, `@ApiOperation`, `@ApiResponse({ status: 200, type: Dto })`, and `@Query() query: QueryDto`.
5. **Tests**: create `src/reports/reports.service.spec.ts` if it's missing, with `{ provide: getModelToken(Entry.name), useValue: { aggregate: vi.fn() } }`. Assert the pipeline's `$match` contains an ObjectId user and that the result is shaped correctly, including the empty-data case. Add a controller spec case too.
6. **Verify**: `pnpm run lint && pnpm run build && pnpm exec vitest run`.

## If a report needs a different collection

Register that model in `ReportsModule` via `MongooseModule.forFeature` (read-only is fine). Writes must go through the owning module's exported service.
