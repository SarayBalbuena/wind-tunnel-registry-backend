import type { ThrottlerOptions } from '@nestjs/throttler';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/**
 * Limits for POST /auth/magic-link.
 * - per-email: stops one inbox from being flooded with links.
 * - global: caps total sends so the SMTP account's daily quota (Gmail ~500/day) can't be drained.
 * The global cap doesn't depend on the client IP, which is unreliable behind Koyeb's proxy.
 */
export const MAGIC_LINK_THROTTLERS: ThrottlerOptions[] = [
  {
    name: 'magic-link-email',
    ttl: FIFTEEN_MINUTES,
    limit: 3,
    getTracker: (req: Record<string, any>) => {
      const email = (req.body as { email?: unknown } | undefined)?.email;
      return typeof email === 'string'
        ? email.trim().toLowerCase()
        : String(req.ip);
    },
  },
  {
    name: 'magic-link-global',
    ttl: ONE_HOUR,
    limit: 50,
    getTracker: () => 'global',
  },
];
