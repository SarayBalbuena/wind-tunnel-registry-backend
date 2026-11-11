import { isAllowedFrontendOrigin } from './frontend-origin';

describe('isAllowedFrontendOrigin', () => {
  it.each([
    'http://localhost:5173',
    'https://wind-tunnel-registry-frontend.vercel.app',
    'https://wind-tunnel-registry-frontend-git-feat-e-23d095-blue-butterfly1.vercel.app',
    'https://wind-tunnel-registry-frontend-91gl3pnhh-blue-butterfly1.vercel.app',
  ])('allows %s', (origin) => {
    expect(isAllowedFrontendOrigin(origin)).toBe(true);
  });

  it.each([
    undefined,
    null,
    42,
    ['https://wind-tunnel-registry-frontend.vercel.app'],
    '',
    'https://evil.com',
    // other teams' apps and lookalike hosts
    'https://wind-tunnel-registry-frontend-git-x-other-team.vercel.app',
    'https://wind-tunnel-registry-frontend-x-blue-butterfly1.vercel.app.evil.com',
    'https://evil.com/https://wind-tunnel-registry-frontend-x-blue-butterfly1.vercel.app',
    'https://evil.com?.wind-tunnel-registry-frontend-x-blue-butterfly1.vercel.app',
    'http://wind-tunnel-registry-frontend-x-blue-butterfly1.vercel.app',
    'https://wind-tunnel-registry-frontend.vercel.app.evil.com',
    'https://wind-tunnel-registry-frontend.vercel.app/',
    'http://localhost:5173@evil.com',
  ])('rejects %s', (origin) => {
    expect(isAllowedFrontendOrigin(origin)).toBe(false);
  });
});
