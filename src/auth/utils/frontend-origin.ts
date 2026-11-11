/** Fixed frontends: local development and production. */
const STATIC_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://substantial-rosalynd-blue-code-1a304522.koyeb.app',
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
export const isAllowedOrigin = (origin: string | undefined): boolean =>
  !!origin && (STATIC_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin));

/**
 * Where to send the browser after login. `requested` comes from the query
 * string, so it is only used when it is an allowed origin; otherwise (or when
 * missing) the configured FRONTEND_URL is used. The path of FRONTEND_URL is
 * kept so the user lands on the same page as before.
 */
export const resolveLoginRedirect = (
  requested: unknown,
  frontendUrl: string | undefined,
): string => {
  const fallback = frontendUrl ?? '';
  if (typeof requested !== 'string' || !isAllowedOrigin(requested)) {
    return fallback;
  }

  try {
    const base = new URL(frontendUrl ?? requested);
    return new URL(`${base.pathname}${base.search}`, requested).toString();
  } catch {
    return requested;
  }
};
