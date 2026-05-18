export function homePage(baseUrl: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>copy-markdown — Webpage to Markdown</title>
  <style>${CSS}</style>
</head>
<body>
  <main>
    <h1>copy-markdown</h1>
    <p class="tagline">Paste any URL. Get clean Markdown. Free, no account needed.</p>
    <form id="form">
      <input
        id="url"
        type="url"
        placeholder="https://example.com/article"
        autocomplete="off"
        spellcheck="false"
        required
      />
      <button type="submit">Convert</button>
    </form>
    <p class="hint">Or use the URL directly: <code>${baseUrl}/https://example.com</code></p>
  </main>
  <script>
    document.getElementById('form').addEventListener('submit', function(e) {
      e.preventDefault();
      const url = document.getElementById('url').value.trim();
      if (url) window.location.href = '/' + url;
    });
  </script>
</body>
</html>`;
}

export function resultPage(markdown: string, title: string, fallback: boolean, sourceUrl: string): string {
	const escaped = markdown.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	const chars = markdown.length.toLocaleString();
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)} — copy-markdown</title>
  <style>${CSS}</style>
</head>
<body>
  <main class="result">
    <div class="toolbar">
      <a href="/" class="back">← New URL</a>
      <span class="meta">${escHtml(title)} &middot; ${chars} chars</span>
      <button id="copy">Copy</button>
    </div>
    ${fallback ? '<p class="warning">⚠️ Could not extract main content — showing best-effort Markdown.</p>' : ""}
    <textarea id="md" readonly spellcheck="false">${escaped}</textarea>
  </main>
  <div id="toast">Copied!</div>
  <script>
    const ta = document.getElementById('md');
    ta.focus();
    ta.select();
    document.getElementById('copy').addEventListener('click', function() {
      navigator.clipboard.writeText(ta.value).then(function() {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(function() { toast.classList.remove('show'); }, 2000);
      });
    });
  </script>
</body>
</html>`;
}

export function errorPage(message: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Error — copy-markdown</title>
  <style>${CSS}</style>
</head>
<body>
  <main>
    <h1>copy-markdown</h1>
    <p class="error">${escHtml(message)}</p>
    <a href="/">← Try another URL</a>
  </main>
</body>
</html>`;
}

function escHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f0f0f;color:#e8e8e8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
main{width:100%;max-width:640px}
h1{font-size:1.5rem;font-weight:700;margin-bottom:.5rem;color:#fff}
.tagline{color:#aaa;margin-bottom:1.5rem;font-size:.95rem}
form{display:flex;gap:.5rem}
input[type=url]{flex:1;padding:.65rem .9rem;border:1px solid #333;border-radius:6px;background:#1a1a1a;color:#e8e8e8;font-size:1rem;outline:none}
input[type=url]:focus{border-color:#555}
button{padding:.65rem 1.2rem;background:#fff;color:#000;border:none;border-radius:6px;font-size:1rem;font-weight:600;cursor:pointer;white-space:nowrap}
button:hover{background:#e8e8e8}
.hint{margin-top:1rem;color:#666;font-size:.85rem}
code{background:#1a1a1a;padding:.1em .35em;border-radius:3px;font-size:.85em}
.result{max-width:100%;padding:1rem}
.toolbar{display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem;flex-wrap:wrap}
.back{color:#aaa;text-decoration:none;font-size:.9rem}
.back:hover{color:#fff}
.meta{color:#666;font-size:.85rem;flex:1}
.warning{color:#f59e0b;margin-bottom:.75rem;font-size:.875rem}
textarea{width:100%;height:calc(100vh - 140px);padding:.75rem;background:#1a1a1a;border:1px solid #333;border-radius:6px;color:#e8e8e8;font-family:'SF Mono',ui-monospace,monospace;font-size:.875rem;resize:vertical;outline:none;line-height:1.5}
#toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(2rem);background:#22c55e;color:#000;padding:.5rem 1.25rem;border-radius:99px;font-weight:600;font-size:.875rem;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.error{color:#f87171;margin-bottom:1rem}
a{color:#aaa}a:hover{color:#fff}
`;
