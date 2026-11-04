---
name: new-auth-strategy
description: Add a new Passport authentication strategy, guard, or auth-related decorator to this NestJS app (e.g. GitHub/Apple OAuth, API key, refresh token, roles guard, public-route decorator, CurrentUser decorator). Use when the user asks for a new strategy, login provider, guard, or auth mechanism.
---

# New auth strategy / guard

Read `src/auth/` fully before you start: `auth.module.ts`, `auth.controller.ts`, `strategies/*.ts`, `guards/jwt-auth.guard.ts`, plus `src/users/users.service.ts`.

## How auth works here

- `GoogleStrategy` (name `'google'`) → `UsersService.findOrCreate(profile)` → `req.user`.
- The callback calls `AuthService.generateToken(user)` (payload `{ sub, email }`) and sets the `access_token` httpOnly cookie.
- `JwtStrategy` (default name `'jwt'`) reads the cookie and loads the user by `sub`. `JwtAuthGuard` wraps it.

## A. New OAuth / login provider (e.g. GitHub)

1. `pnpm add passport-<provider>` and `pnpm add -D @types/passport-<provider>` if types exist.
2. `src/auth/strategies/<provider>.strategy.ts`:
   ```ts
   @Injectable()
   export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
     constructor(private configService: ConfigService, private usersService: UsersService) {
       super({
         clientID: configService.getOrThrow<string>('GITHUB_CLIENT_ID'),
         clientSecret: configService.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
         callbackURL: configService.getOrThrow<string>('GITHUB_CALLBACK_URL'),
         scope: ['user:email'],
       });
     }
     async validate(accessToken: string, refreshToken: string, profile: Profile) {
       return this.usersService.findOrCreateFromProvider('github', profile);
     }
   }
   ```
   - Prefer `getOrThrow` for secrets. Don't add new `'placeholder'` fallbacks.
3. **User schema**: `User.googleId` is required and unique today. Supporting another provider needs a schema change. Recommended: make `googleId` optional + `sparse: true`, add `<provider>Id` (optional, unique, sparse), and link accounts by email when it's verified. **Ask the user before changing the schema**, because it affects existing data.
4. `UsersService`: add a provider-aware `findOrCreate...` method, and keep `findOrCreate(profile)` working for Google.
5. Register the strategy in `AuthModule.providers`.
6. `AuthController`: add `GET /auth/<provider>` and `GET /auth/<provider>/callback` with `@UseGuards(AuthGuard('<provider>'))`. Pull the cookie-setting code into a private helper so both callbacks share it, rather than duplicating it.
7. Env vars → README, CLAUDE.md, and tell the user to set them in Koyeb.

## B. Non-OAuth strategy (API key, header token, local)

- Use `passport-custom`, `passport-headerapikey` or `passport-local`, and give it a unique name.
- Add a guard: `export class ApiKeyAuthGuard extends AuthGuard('api-key') {}` in `src/auth/guards/`.
- `validate()` returns the principal or throws `UnauthorizedException`.

## C. Guards and decorators without Passport

- **Public route**: `src/auth/decorators/public.decorator.ts` with `SetMetadata(IS_PUBLIC_KEY, true)`, then override `canActivate` in `JwtAuthGuard` to check `Reflector`. Only worth doing if the guard becomes global (`APP_GUARD`).
- **CurrentUser**: `createParamDecorator((_, ctx) => ctx.switchToHttp().getRequest().user as UserDocument)`. If you introduce it, use it in the new code only. Refactoring existing controllers is a separate change.
- **Roles**: needs a `roles` field on `User`. Ask first.

## Tests

- Strategy: instantiate with mocked `ConfigService` (`{ get: vi.fn(), getOrThrow: vi.fn().mockReturnValue('x') }`) and mocked `UsersService`. Test that `validate` returns the user, and throws/returns null on a miss.
- Controller: mock `AuthService` and assert `res.cookie` and `res.redirect` calls with a mocked `Response`.
- Run `pnpm run lint && pnpm run build && pnpm exec vitest run`.

## Security checklist

- Cookie: `httpOnly`, `secure` and `sameSite: 'none'` in production (reuse the existing `isProduction` logic).
- Never log tokens or profiles containing tokens.
- New frontend origins → the CORS list in `src/main.ts`.
