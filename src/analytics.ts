export async function trackEvent(
	env: Env,
	event: string,
	properties: Record<string, unknown>,
	distinctId = 'server',
): Promise<void> {
	if (!env.POSTHOG_API_KEY || !env.POSTHOG_HOST) return
	try {
		await fetch(`${env.POSTHOG_HOST}/capture/`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				api_key: env.POSTHOG_API_KEY,
				event,
				distinct_id: distinctId,
				properties,
			}),
		})
	} catch {
		// Analytics is best-effort — never fail the Worker response
	}
}

export async function hashIp(ip: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))
	return Array.from(new Uint8Array(buf))
		.slice(0, 8)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
}
