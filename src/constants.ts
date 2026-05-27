import { version } from '../package.json';

export const APP_NAME = 'url-to-markdown';

export const MAX_BODY_BYTES = 5 * 1024 * 1024;
export const MAX_REDIRECTS = 5;
export const TIMEOUT_MS = 8_000;

export const DEFAULT_USER_AGENT = `Mozilla/5.0 (compatible; UrlToMarkdown/${version}; +https://github.com/choubari/url-to-markdown)`;

export function buildUserAgent(baseUrl: string): string {
	return `Mozilla/5.0 (compatible; UrlToMarkdown/${version}; +${baseUrl})`;
}
