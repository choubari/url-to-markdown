import { convertUrl } from './convert';
import { resultPage, errorPage } from './html';
import { trackEvent, hashIp } from './analytics';
import { DEFAULT_USER_AGENT, buildUserAgent } from './constants';

const ERROR_MESSAGES: Record<string, string> = {
	invalid_url: 'Not a valid URL — must start with http:// or https://',
	timeout: 'Page took too long to respond',
	too_large: 'Page is too large (over 5 MB)',
	too_many_redirects: 'Too many redirects',
	bad_redirect: 'Invalid redirect from target page',
	blocked_url: 'URL not allowed',
	upstream_error: 'Page returned an error',
	fetch_error: 'Could not reach the page',
};

function htmlHeaders(phHost?: string): HeadersInit {
	const connectSrc = phHost ? `'self' ${phHost}` : "'self'";
	return {
		'Content-Type': 'text/html; charset=utf-8',
		'X-Content-Type-Options': 'nosniff',
		'X-Frame-Options': 'SAMEORIGIN',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'Content-Security-Policy': `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src ${connectSrc}`,
	};
}

function wantsRaw(request: Request): boolean {
	const accept = request.headers.get('Accept') ?? '';
	return accept.includes('text/markdown') || accept.includes('text/plain');
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

		// Health check
		if (url.pathname === '/health') {
			return new Response('ok', { status: 200 });
		}

		// Extract target URL: everything after the leading /
		const rawTarget = url.pathname.slice(1) + url.search;

		if (!rawTarget.startsWith('http://') && !rawTarget.startsWith('https://')) {
			if (wantsRaw(request)) {
				return Response.json({ error: 'invalid_url' }, { status: 400 });
			}
			return new Response(errorPage('Not a valid URL — must start with http:// or https://'), {
				status: 400,
				headers: htmlHeaders(env.POSTHOG_HOST),
			});
		}

		// Rate limiting (binding absent in local/test environments — allow through)
		const rateLimitResult = env.RATE_LIMITER ? await env.RATE_LIMITER.limit({ key: ip }) : { success: true };
		if (!rateLimitResult.success) {
			ctx.waitUntil(hashIp(ip).then((id) => trackEvent(env, 'rate_limited', { ip_hash: id })));
			if (wantsRaw(request)) {
				return Response.json({ error: 'rate_limited' }, { status: 429 });
			}
			return new Response(errorPage('Too many requests — please wait a moment and try again.'), {
				status: 429,
				headers: htmlHeaders(env.POSTHOG_HOST),
			});
		}

		// Track shared link opens
		const utmSource = url.searchParams.get('utm_source');
		if (utmSource === 'url-to-markdown') {
			ctx.waitUntil(
				hashIp(ip).then((id) =>
					trackEvent(env, 'shared_link_opened', { utm_medium: url.searchParams.get('utm_medium'), target_url: rawTarget }, id),
				),
			);
		}

		const userAgent = env.BASE_URL ? buildUserAgent(env.BASE_URL) : DEFAULT_USER_AGENT;

		const result = await convertUrl(rawTarget, userAgent);

		if (!result.ok) {
			const message =
				result.code === 'upstream_error' && result.detail
					? `Page returned error ${result.detail}`
					: (ERROR_MESSAGES[result.code] ?? 'Something went wrong');

			ctx.waitUntil(
				hashIp(ip).then((id) =>
					trackEvent(env, 'conversion_error', { error_code: result.code, target_domain: new URL(rawTarget).hostname }, id),
				),
			);

			if (wantsRaw(request)) {
				return Response.json({ error: result.code }, { status: result.status });
			}
			return new Response(errorPage(message), {
				status: result.status,
				headers: htmlHeaders(env.POSTHOG_HOST),
			});
		}

		const { markdown, title, fallback } = result;

		ctx.waitUntil(
			hashIp(ip).then((id) =>
				trackEvent(
					env,
					'url_converted',
					{
						target_domain: new URL(rawTarget).hostname,
						char_count: markdown.length,
						fallback,
						utm_source: utmSource,
					},
					id,
				),
			),
		);

		if (wantsRaw(request)) {
			const body = fallback ? `<!-- readability: fallback -->\n\n${markdown}` : markdown;
			return new Response(body, {
				headers: { 'Content-Type': 'text/plain; charset=utf-8' },
			});
		}

		return new Response(resultPage(markdown, title, fallback, env.POSTHOG_PUBLIC_KEY, env.POSTHOG_HOST), {
			headers: htmlHeaders(env.POSTHOG_HOST),
		});
	},
} satisfies ExportedHandler<Env>;
