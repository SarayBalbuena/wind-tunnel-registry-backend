import { MAGIC_LINK_THROTTLERS } from './magic-link-throttle';

describe('MAGIC_LINK_THROTTLERS', () => {
  const byName = (name: string) =>
    MAGIC_LINK_THROTTLERS.find((t) => t.name === name)!;

  describe('magic-link-email', () => {
    it('tracks by normalized email', async () => {
      const tracker = await byName('magic-link-email').getTracker!(
        { body: { email: ' A@B.com ' }, ip: '1.2.3.4' },
        undefined as any,
      );
      expect(tracker).toBe('a@b.com');
    });

    it('falls back to the IP when there is no email', async () => {
      const tracker = await byName('magic-link-email').getTracker!(
        { body: {}, ip: '1.2.3.4' },
        undefined as any,
      );
      expect(tracker).toBe('1.2.3.4');
    });
  });

  describe('magic-link-global', () => {
    it('uses one shared bucket', async () => {
      const tracker = await byName('magic-link-global').getTracker!(
        { ip: '1.2.3.4' },
        undefined as any,
      );
      expect(tracker).toBe('global');
    });
  });
});
