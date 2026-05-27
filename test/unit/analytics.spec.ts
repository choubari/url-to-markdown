import { describe, it, expect, vi, afterEach } from 'vitest';
import { hashIp, trackEvent } from '../../src/analytics';

describe('hashIp', () => {
  it('produces a hex string', async () => {
    const hash = await hashIp('1.2.3.4');
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('produces the same hash for the same IP', async () => {
    const a = await hashIp('192.168.1.1');
    const b = await hashIp('192.168.1.1');
    expect(a).toBe(b);
  });

  it('produces different hashes for different IPs', async () => {
    const a = await hashIp('1.1.1.1');
    const b = await hashIp('8.8.8.8');
    expect(a).not.toBe(b);
  });

  it('truncates to 16 hex characters (8 bytes)', async () => {
    const hash = await hashIp('10.0.0.1');
    expect(hash).toHaveLength(16);
  });

  it('handles IPv6', async () => {
    const hash = await hashIp('::1');
    expect(hash).toHaveLength(16);
  });
});

describe('trackEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a no-op when POSTHOG_API_KEY is absent', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    const env = { POSTHOG_API_KEY: '' } as unknown as Env;
    await trackEvent(env, 'test_event', {});
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends event to PostHog when key is present', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', mockFetch);
    const env = {
      POSTHOG_API_KEY: 'phc_testkey',
      POSTHOG_HOST: 'https://eu.i.posthog.com',
    } as unknown as Env;
    await trackEvent(env, 'url_converted', { target_domain: 'example.com' });
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/capture/');
    const body = JSON.parse(opts.body);
    expect(body.event).toBe('url_converted');
    expect(body.api_key).toBe('phc_testkey');
    expect(body.properties.target_domain).toBe('example.com');
  });

  it('swallows fetch errors without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network fail')));
    const env = { POSTHOG_API_KEY: 'phc_key', POSTHOG_HOST: 'https://eu.i.posthog.com' } as unknown as Env;
    await expect(trackEvent(env, 'event', {})).resolves.toBeUndefined();
  });

  it('uses default distinctId "server"', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', mockFetch);
    const env = { POSTHOG_API_KEY: 'phc_key', POSTHOG_HOST: 'https://eu.i.posthog.com' } as unknown as Env;
    await trackEvent(env, 'test', {});
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.distinct_id).toBe('server');
  });
});
