import { describe, it, expect } from 'vitest';
import { resultPage, errorPage } from '../../src/html';

describe('resultPage', () => {
  it('escapes markdown content for safe textarea rendering', () => {
    const xss = '<script>alert("xss")</script>';
    const html = resultPage(xss, 'Test', false, '', '');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });

  it('escapes ampersands in markdown', () => {
    const html = resultPage('a & b', 'Test', false, '', '');
    expect(html).toContain('a &amp; b');
  });

  it('escapes title to prevent injection in <title> tag', () => {
    const html = resultPage('content', '<evil>', false, '', '');
    expect(html).toContain('&lt;evil&gt;');
  });

  it('includes fallback warning when fallback=true', () => {
    const html = resultPage('md', 'Title', true, '', '');
    expect(html).toContain('Could not extract main content');
  });

  it('omits fallback warning when fallback=false', () => {
    const html = resultPage('md', 'Title', false, '', '');
    expect(html).not.toContain('Could not extract main content');
  });

  it('injects PostHog key into page config', () => {
    const html = resultPage('md', 'Title', false, 'phc_testkey', 'https://eu.i.posthog.com');
    expect(html).toContain('"phc_testkey"');
    expect(html).toContain('"https://eu.i.posthog.com"');
  });

  it('works with empty PostHog key (analytics disabled)', () => {
    const html = resultPage('md', 'Title', false, '', '');
    expect(html).toContain('window.__PH_KEY = ""');
  });

  it('includes char count in toolbar', () => {
    const md = 'hello world';
    const html = resultPage(md, 'Title', false, '', '');
    expect(html).toContain(md.length.toLocaleString());
  });

  it('links to external result.js', () => {
    const html = resultPage('md', 'Title', false, '', '');
    expect(html).toContain('src="/result.js"');
  });

  it('includes cookie banner', () => {
    const html = resultPage('md', 'Title', false, '', '');
    expect(html).toContain('cookie-banner');
  });

  it('references stylesheet', () => {
    const html = resultPage('md', 'Title', false, '', '');
    expect(html).toContain('href="/style.css"');
  });
});

describe('errorPage', () => {
  it('escapes error message to prevent XSS', () => {
    const html = errorPage('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img src=x');
  });

  it('escapes & in error message', () => {
    const html = errorPage('A & B error');
    expect(html).toContain('A &amp; B error');
  });

  it('includes back link to homepage', () => {
    const html = errorPage('Something went wrong');
    expect(html).toContain('href="/"');
  });

  it('includes cookie banner', () => {
    const html = errorPage('err');
    expect(html).toContain('cookie-banner');
  });

  it('references stylesheet', () => {
    const html = errorPage('err');
    expect(html).toContain('href="/style.css"');
  });
});
