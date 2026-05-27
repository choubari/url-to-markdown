declare module '*.html' {
	const content: string;
	export default content;
}

interface RateLimit {
	limit(options: { key: string }): Promise<{ success: boolean }>
}

interface Env {
	RATE_LIMITER?: RateLimit
	BASE_URL: string
	POSTHOG_API_KEY?: string   // set via: wrangler secret put POSTHOG_API_KEY
	POSTHOG_PUBLIC_KEY: string
	POSTHOG_HOST: string
}
