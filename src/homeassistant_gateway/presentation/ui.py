from pathlib import Path

from fastapi.responses import FileResponse, HTMLResponse, Response

UI_DIST = Path("/app/static")
UI_CATALOG_DIST = Path("/app/catalog")

FALLBACK_HTML = """<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Home Assistant Gateway</title>
<style>:root{color-scheme:dark}body{margin:0;min-height:100vh;background:#07111f;color:#e7f0fb;font:15px/1.5 system-ui,sans-serif}main{width:min(900px,calc(100% - 40px));margin:auto;padding:56px 0}.eyebrow{color:#40a9ff;letter-spacing:.14em;text-transform:uppercase;font-size:12px;font-weight:700}h1{font-size:clamp(30px,5vw,56px);line-height:1.05}.lead,p{color:#8ea5bd}.status{color:#47d18c;font-weight:700}</style></head>
<body><main><div class="eyebrow">Home Assistant App · MCP Gateway</div><h1>Secure gateway control plane.</h1><p class="lead">The compiled management UI is not available in this development environment.</p><div class="status" id="status">Checking readiness…</div><script>fetch(new URL('ready',window.location.href)).then(r=>r.json()).then(d=>{document.querySelector('#status').textContent=d.status==='ready'?'Gateway ready':'Gateway not ready'}).catch(()=>{document.querySelector('#status').textContent='Readiness unavailable'});</script></main></body></html>"""


def index_response() -> Response:
    compiled_index = UI_DIST / "index.html"
    if compiled_index.is_file():
        return FileResponse(compiled_index)
    return HTMLResponse(FALLBACK_HTML)
