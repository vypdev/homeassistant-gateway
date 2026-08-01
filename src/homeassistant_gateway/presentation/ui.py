from fastapi.responses import HTMLResponse

INDEX_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Home Assistant Gateway</title>
  <style>
    :root { color-scheme: dark; --bg: #07111f; --panel: #0d1b2e; --line: #1c3552; --text: #e7f0fb; --muted: #8ea5bd; --accent: #40a9ff; --ok: #47d18c; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; color: var(--text); font: 15px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; background: radial-gradient(circle at 80% 0%, #12345a 0, transparent 42%), var(--bg); }
    main { width: min(1080px, calc(100% - 40px)); margin: 0 auto; padding: 56px 0; }
    .eyebrow { color: var(--accent); letter-spacing: .14em; text-transform: uppercase; font-size: 12px; font-weight: 700; }
    h1 { margin: 10px 0 8px; font-size: clamp(30px, 5vw, 56px); line-height: 1.05; letter-spacing: -.04em; }
    .lead { max-width: 660px; color: var(--muted); font-size: 17px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 34px; }
    .card { padding: 22px; border: 1px solid var(--line); border-radius: 16px; background: color-mix(in srgb, var(--panel) 88%, transparent); box-shadow: 0 20px 60px #0003; }
    .card h2 { margin: 0 0 6px; font-size: 17px; }
    .card p { margin: 0; color: var(--muted); }
    .status { display: inline-flex; align-items: center; gap: 8px; margin-top: 16px; color: var(--ok); font-weight: 700; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: currentColor; box-shadow: 0 0 14px currentColor; }
    footer { margin-top: 40px; color: var(--muted); font-size: 13px; }
    code { color: #b9ddff; }
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">Home Assistant App · MCP Gateway</div>
    <h1>Secure gateway control plane.</h1>
    <p class="lead">Manage observer clients, capabilities and read-only MCP access from a Supervisor Ingress session.</p>
    <div class="status"><span class="dot"></span><span id="status">Checking readiness…</span></div>
    <section class="grid" aria-label="Gateway areas">
      <article class="card"><h2>Clients & tokens</h2><p>Issue and revoke independent MCP client credentials. Tokens are shown only once.</p></article>
      <article class="card"><h2>Capabilities</h2><p>Review observer permissions and keep operator mutations disabled by default.</p></article>
      <article class="card"><h2>MCP transport</h2><p>Streamable HTTP endpoint at <code>/mcp/</code> with bearer authentication.</p></article>
      <article class="card"><h2>Audit trail</h2><p>Sanitized request and authorization events persist in the private App data directory.</p></article>
    </section>
    <footer>Home Assistant Gateway <span aria-hidden="true">·</span> observer-first security model</footer>
  </main>
  <script>
    const status = document.querySelector('#status');
    fetch(new URL('ready', window.location.href)).then(r => r.json()).then(data => {
      status.textContent = data.status === 'ready' ? 'Gateway ready' : 'Gateway not ready';
    }).catch(() => { status.textContent = 'Readiness unavailable'; });
  </script>
</body>
</html>"""


def index_response() -> HTMLResponse:
    return HTMLResponse(INDEX_HTML)
