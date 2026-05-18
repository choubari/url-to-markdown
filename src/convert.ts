import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { NodeHtmlMarkdown } from "node-html-markdown";

export type ConvertResult =
	| { ok: true; markdown: string; fallback: boolean; title: string }
	| { ok: false; status: number; code: string; detail?: string };

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8000;

const USER_AGENT =
	"Mozilla/5.0 (compatible; CopyMarkdown/1.0; +https://github.com/kawtar/copy-markdown)";

const nhm = new NodeHtmlMarkdown({ useInlineLinks: true });

function decodeBody(buffer: ArrayBuffer, contentType: string): string {
	const match = contentType.match(/charset=([^\s;]+)/i);
	const charset = match ? match[1].replace(/"/g, "") : "utf-8";
	try {
		return new TextDecoder(charset).decode(buffer);
	} catch {
		return new TextDecoder("utf-8").decode(buffer);
	}
}

function extractMarkdown(html: string, url: string): { markdown: string; fallback: boolean; title: string } {
	const { document } = parseHTML(html);

	// Readability needs a location on the document
	(document as unknown as { location: { href: string } }).location = { href: url };

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const reader = new Readability(document as any);
	const article = reader.parse();

	let sourceHtml: string;
	let fallback = false;
	const title = article?.title ?? new URL(url).hostname;

	if (article?.content) {
		sourceHtml = article.content;
	} else {
		// Fallback: strip noise and use full body
		fallback = true;
		for (const tag of ["script", "style", "nav", "footer", "header", "noscript"]) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(document as any).querySelectorAll(tag).forEach((el: any) => el.remove());
		}
		sourceHtml = document.body?.innerHTML ?? html;
	}

	const markdown = nhm.translate(sourceHtml);

	return { markdown, fallback, title };
}

export async function convertUrl(rawTarget: string): Promise<ConvertResult> {
	// Validate URL
	let target: URL;
	try {
		target = new URL(rawTarget);
	} catch {
		return { ok: false, status: 400, code: "invalid_url" };
	}
	if (target.protocol !== "http:" && target.protocol !== "https:") {
		return { ok: false, status: 400, code: "invalid_url" };
	}

	// Fetch with manual redirect handling
	let currentUrl = rawTarget;
	let hops = 0;
	let response: Response;

	while (true) {
		let fetchResponse: Response;
		try {
			fetchResponse = await fetch(currentUrl, {
				redirect: "manual",
				signal: AbortSignal.timeout(TIMEOUT_MS),
				headers: { "User-Agent": USER_AGENT },
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes("timeout") || msg.includes("TimeoutError")) {
				return { ok: false, status: 504, code: "timeout" };
			}
			return { ok: false, status: 502, code: "fetch_error", detail: msg };
		}

		if (fetchResponse.status >= 300 && fetchResponse.status < 400) {
			if (hops >= MAX_REDIRECTS) {
				return { ok: false, status: 502, code: "too_many_redirects" };
			}
			const location = fetchResponse.headers.get("Location");
			if (!location) {
				return { ok: false, status: 502, code: "bad_redirect" };
			}
			// Resolve relative redirects
			const next = new URL(location, currentUrl);
			if (next.protocol !== "http:" && next.protocol !== "https:") {
				return { ok: false, status: 403, code: "blocked_url" };
			}
			currentUrl = next.toString();
			hops++;
			continue;
		}

		if (fetchResponse.status >= 400) {
			return { ok: false, status: 502, code: "upstream_error", detail: String(fetchResponse.status) };
		}

		response = fetchResponse;
		break;
	}

	// Check body size
	const contentLength = response.headers.get("Content-Length");
	if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
		return { ok: false, status: 413, code: "too_large" };
	}

	const buffer = await response.arrayBuffer();
	if (buffer.byteLength > MAX_BODY_BYTES) {
		return { ok: false, status: 413, code: "too_large" };
	}

	const contentType = response.headers.get("Content-Type") ?? "text/html";
	const html = decodeBody(buffer, contentType);

	const { markdown, fallback, title } = extractMarkdown(html, currentUrl);

	return { ok: true, markdown, fallback, title };
}
