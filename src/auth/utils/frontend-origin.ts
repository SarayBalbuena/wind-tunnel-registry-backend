/** Frontends allowed to receive a magic link: local development and production. */
const STATIC_ORIGINS = [
  'http://localhost:5173',
  'https://wind-tunnel-registry-frontend.vercel.app',
];

/**
 * Vercel preview deployments of this project only: the project name, then
 * anything, then the team slug. Other people's *.vercel.app apps do not match.
 *   wind-tunnel-registry-frontend-git-<branch>-blue-butterfly1.vercel.app
 *   wind-tunnel-registry-frontend-<hash>-blue-butterfly1.vercel.app
 */
const PREVIEW_ORIGIN =
  /^https:\/\/wind-tunnel-registry-frontend-[a-z0-9-]+-blue-butterfly1\.vercel\.app$/;

/** Exact origin match, never a prefix or substring match. */
export const isAllowedFrontendOrigin = (origin: unknown): origin is string =>
  typeof origin === 'string' &&
  (STATIC_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin));
