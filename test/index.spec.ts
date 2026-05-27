// Mock convert.ts to prevent node-html-markdown/css-select from loading in
// Miniflare's CJS→ESM shim (crashes with SelectorType undefined at module init).
vi.mock('../src/convert', () => ({
  convertUrl: vi.fn(),
}));

import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index';
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const WORKER_URL = 'https://worker.dev';

describe('worker routing — validation', () => {
  it('health check returns 200 ok', async () => {
    const req = new IncomingRequest(`${WORKER_URL}/health`);
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('returns 400 for non-http/https path', async () => {
    const req = new IncomingRequest(`${WORKER_URL}/ftp://evil.com`);
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(400);
  });

  it('returns 400 for bare non-URL path', async () => {
    const req = new IncomingRequest(`${WORKER_URL}/just-a-path`);
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain('Not a valid URL');
  });

  it('returns HTML content-type on 400 for browser request', async () => {
    const req = new IncomingRequest(`${WORKER_URL}/not-a-url`);
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('400 HTML response includes security headers', async () => {
    const req = new IncomingRequest(`${WORKER_URL}/not-a-url`);
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });

  it('returns JSON error for Accept: text/markdown on 400', async () => {
    const req = new IncomingRequest(`${WORKER_URL}/not-a-url`, {
      headers: { Accept: 'text/markdown' },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(400);
    const body = await res.json<{ error: string }>();
    expect(body.error).toBe('invalid_url');
  });
});

import { convertUrl } from '../src/convert';

describe('worker routing — conversion', () => {
  const mockConvert = vi.mocked(convertUrl);

  afterEach(() => {
    mockConvert.mockReset();
  });

  it('returns raw markdown for Accept: text/markdown on success', async () => {
    mockConvert.mockResolvedValue({ ok: true, markdown: '# Hello\n\nworld', title: 'Test', fallback: false });

    const req = new IncomingRequest(`${WORKER_URL}/https://example.com`, {
      headers: { Accept: 'text/markdown' },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(await res.text()).toContain('Hello');
  });

  it('includes fallback comment in raw output when fallback=true', async () => {
    mockConvert.mockResolvedValue({ ok: true, markdown: 'some content', title: 'Bare', fallback: true });

    const req = new IncomingRequest(`${WORKER_URL}/https://example.com`, {
      headers: { Accept: 'text/markdown' },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(await res.text()).toContain('<!-- readability: fallback -->');
  });

  it('returns HTML result page for browser request on success', async () => {
    mockConvert.mockResolvedValue({ ok: true, markdown: '# Page', title: 'Test Page', fallback: false });

    const req = new IncomingRequest(`${WORKER_URL}/https://example.com`);
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('<textarea');
  });

  it('200 HTML result page includes security headers', async () => {
    mockConvert.mockResolvedValue({ ok: true, markdown: '# Page', title: 'Test Page', fallback: false });

    const req = new IncomingRequest(`${WORKER_URL}/https://example.com`);
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });

  it('JSON API response does not include HTML security headers', async () => {
    mockConvert.mockResolvedValue({ ok: true, markdown: '# Page', title: 'Test Page', fallback: false });

    const req = new IncomingRequest(`${WORKER_URL}/https://example.com`, {
      headers: { Accept: 'text/markdown' },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.headers.get('x-frame-options')).toBeNull();
    expect(res.headers.get('x-content-type-options')).toBeNull();
  });

  it('passes the full target URL including query string to convertUrl', async () => {
    mockConvert.mockResolvedValue({ ok: true, markdown: 'results', title: 'Search', fallback: false });

    const req = new IncomingRequest(`${WORKER_URL}/https://example.com/search?q=hello&page=2`);
    const ctx = createExecutionContext();
    await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(mockConvert).toHaveBeenCalledWith(expect.stringContaining('q=hello'), expect.any(String));
    expect(mockConvert).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.any(String));
  });

  it('returns error HTML when convertUrl returns an error', async () => {
    mockConvert.mockResolvedValue({ ok: false, code: 'fetch_error', status: 502 });

    const req = new IncomingRequest(`${WORKER_URL}/https://example.com`);
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(502);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('returns JSON error when convertUrl fails and client wants markdown', async () => {
    mockConvert.mockResolvedValue({ ok: false, code: 'timeout', status: 504 });

    const req = new IncomingRequest(`${WORKER_URL}/https://example.com`, {
      headers: { Accept: 'text/markdown' },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(504);
    const body = await res.json<{ error: string }>();
    expect(body.error).toBe('timeout');
  });

  it('includes upstream status in error message for upstream_error code', async () => {
    mockConvert.mockResolvedValue({ ok: false, code: 'upstream_error', status: 503, detail: '503' });

    const req = new IncomingRequest(`${WORKER_URL}/https://example.com`);
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(await res.text()).toContain('503');
  });
});
