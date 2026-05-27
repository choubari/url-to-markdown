import { APP_NAME } from './constants';

type SafeHtml = { __html: string };

function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function raw(value: string): SafeHtml {
	return { __html: value };
}

function html(strings: TemplateStringsArray, ...values: Array<string | number | SafeHtml>): string {
	let result = strings[0];
	for (let i = 0; i < values.length; i++) {
		const v = values[i];
		result += typeof v === 'object' && '__html' in v ? v.__html : esc(String(v));
		result += strings[i + 1];
	}
	return result;
}

const COOKIE_BANNER = raw(`<div id="cookie-banner">
  <p>This site uses analytics cookies to understand usage. <a href="/privacy">Privacy policy</a> · <a href="/cookies">Cookie policy</a></p>
  <button id="cookie-accept">Got it</button>
</div>
<script>
  if (localStorage.getItem('cookie_ok')) document.getElementById('cookie-banner').classList.add('hidden');
  document.getElementById('cookie-accept').addEventListener('click', function() {
    localStorage.setItem('cookie_ok', '1');
    document.getElementById('cookie-banner').classList.add('hidden');
  });
</script>`);

export function resultPage(markdown: string, title: string, fallback: boolean, phKey: string, phHost: string): string {
	const chars = markdown.length.toLocaleString();
	const textareaContent = raw(markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
	const fallbackWarning = fallback
		? raw('<p class="warning">⚠️ Could not extract main content — showing best-effort Markdown.</p>')
		: raw('');

	return html`<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>${title} — ${APP_NAME}</title>
				<link rel="stylesheet" href="/style.css" />
			</head>
			<body>
				<main class="result">
					<div class="toolbar">
						<a href="/" class="back">← New URL</a>
						<span class="meta">${title} &middot; ${chars} chars</span>
						<button id="copy">Copy</button>
						<button id="share">Share</button>
					</div>
					${fallbackWarning}
					<textarea id="md" readonly spellcheck="false">${textareaContent}</textarea>
				</main>

				<div id="toast"></div>
				${COOKIE_BANNER}

				<script>
					window.__PH_KEY = ${raw(JSON.stringify(phKey))};
					window.__PH_HOST = ${raw(JSON.stringify(phHost))};
				</script>
				<script src="/result.js"></script>
			</body>
		</html>`;
}

export function errorPage(message: string): string {
	return html`<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Error — ${APP_NAME}</title>
				<link rel="stylesheet" href="/style.css" />
			</head>
			<body>
				<main>
					<h1>${APP_NAME}</h1>
					<p class="error-msg">${message}</p>
					<a href="/">← Try another URL</a>
				</main>
				${COOKIE_BANNER}
			</body>
		</html>`;
}
