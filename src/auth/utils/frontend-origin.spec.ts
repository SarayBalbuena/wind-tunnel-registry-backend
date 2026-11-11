import { isAllowedOrigin, resolveLoginRedirect } from './frontend-origin';

describe('isAllowedOrigin', () => {
  it.each([
    'http://localhost:5173',
    'https://wind-tunnel-registry-frontend.vercel.app',
    'https://wind-tunnel-registry-frontend-git-feat-e-23d095-blue-butterfly1.vercel.app',
    'https://wind-tunnel-registry-frontend-91gl3pnhh-blue-butterfly1.vercel.app',
  ])('allows %s', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(true);
  });

  it.each([
    undefined,
    '',
    'https://evil.com',
    // other teams' apps and lookalike hosts
    'https://wind-tunnel-registry-frontend-git-x-other-team.vercel.app',
    'https://wind-tunnel-registry-frontend-x-blue-butterfly1.vercel.app.evil.com',
    'https://evil.com/https://wind-tunnel-registry-frontend-x-blue-butterfly1.vercel.app',
    'https://evil.com?.wind-tunnel-registry-frontend-x-blue-butterfly1.vercel.app',
    'http://wind-tunnel-registry-frontend-x-blue-butterfly1.vercel.app',
    'https://wind-tunnel-registry-frontend.vercel.app.evil.com',
    'http://localhost:5173@evil.com',
  ])('rejects %s', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(false);
  });
});

describe('resolveLoginRedirect', () => {
  const preview =
    'https://wind-tunnel-registry-frontend-git-feat-e-23d095-blue-butterfly1.vercel.app';
  const production = 'https://wind-tunnel-registry-frontend.vercel.app';

  it('returns to an allowed preview origin', () => {
    expect(resolveLoginRedirect(preview, production)).toBe(`${preview}/`);
  });

  it('keeps the path of FRONTEND_URL', () => {
    expect(resolveLoginRedirect(preview, `${production}/dashboard`)).toBe(
      `${preview}/dashboard`,
    );
  });

  it.each([undefined, '', 'https://evil.com', ['https://evil.com'], 42])(
    'falls back to FRONTEND_URL for %s',
    (requested) => {
      expect(resolveLoginRedirect(requested, production)).toBe(production);
    },
  );

  it('falls back to an empty string without FRONTEND_URL or a valid origin', () => {
    expect(resolveLoginRedirect('https://evil.com', undefined)).toBe('');
  });
});
