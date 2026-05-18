import { convertUrl } from "./convert";
import { homePage, resultPage, errorPage } from "./html";

const ERROR_MESSAGES: Record<string, string> = {
	invalid_url: "Not a valid URL — must start with http:// or https://",
	timeout: "Page took too long to respond",
	too_large: "Page is too large (over 5 MB)",
	too_many_redirects: "Too many redirects",
	bad_redirect: "Invalid redirect from target page",
	blocked_url: "URL not allowed",
	upstream_error: "Page returned an error",
	fetch_error: "Could not reach the page",
};

function wantsRaw(request: Request): boolean {
	const accept = request.headers.get("Accept") ?? "";
	return accept.includes("text/markdown") || accept.includes("text/plain");
}

function baseUrl(request: Request): string {
	const url = new URL(request.url);
	return `${url.protocol}//${url.host}`;
}

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// Health check
		if (url.pathname === "/health") {
			return new Response("ok", { status: 200 });
		}

		// Homepage
		if (url.pathname === "/" || url.pathname === "") {
			return new Response(homePage(baseUrl(request)), {
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
		}

		// Extract target URL: everything after the leading /
		// url.pathname gives us the path portion, but we need to preserve
		// the target URL's query string which the Workers runtime puts in url.search
		const rawTarget = url.pathname.slice(1) + url.search;

		if (!rawTarget.startsWith("http://") && !rawTarget.startsWith("https://")) {
			if (wantsRaw(request)) {
				return Response.json({ error: "invalid_url" }, { status: 400 });
			}
			return new Response(errorPage("Not a valid URL — must start with http:// or https://"), {
				status: 400,
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
		}

		const result = await convertUrl(rawTarget);

		if (!result.ok) {
			const message = result.code === "upstream_error" && result.detail
				? `Page returned error ${result.detail}`
				: (ERROR_MESSAGES[result.code] ?? "Something went wrong");

			if (wantsRaw(request)) {
				return Response.json({ error: result.code }, { status: result.status });
			}
			return new Response(errorPage(message), {
				status: result.status,
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
		}

		const { markdown, title, fallback } = result;

		if (wantsRaw(request)) {
			const body = fallback ? `<!-- readability: fallback -->\n\n${markdown}` : markdown;
			return new Response(body, {
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			});
		}

		return new Response(resultPage(markdown, title, fallback, rawTarget), {
			headers: { "Content-Type": "text/html; charset=utf-8" },
		});
	},
} satisfies ExportedHandler<Env>;
