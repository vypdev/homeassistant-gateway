# Release checklist — v0.5.0

## Alcance

- [ ] Confirmar que no quedan secretos, tokens, cookies o `SUPERVISOR_TOKEN` en código, tests, logs, fixtures ni documentación.
- [ ] Confirmar que el perfil `observer` sigue siendo read-only y que las herramientas efectivas siguen siendo 18.
- [ ] Confirmar separación Ingress/MCP directo y `mcp_allowed_hosts` sin `*` global.

## Gates locales

Desde la raíz del repositorio:

```bash
.venv/bin/python -m pytest -q
.venv/bin/ruff check src tests scripts
.venv/bin/python -m compileall -q src tests scripts
.venv/bin/python -m pip_audit --skip-editable
.venv/bin/python scripts/check_frontend_i18n.py
.venv/bin/python scripts/check_frontend_i18n_runtime.py
npm --prefix frontend run test:runtime
npm --prefix frontend run check
npm --prefix frontend run build
git diff --check
git status --short
```

El árbol debe quedar limpio y todos los comandos deben terminar con código `0`.

## Metadata

- [ ] `addon/config.yaml` tiene versión `0.5.0`.
- [ ] `pyproject.toml` tiene versión `0.5.0`.
- [ ] `addon/CHANGELOG.md` describe cambios, límites y migración.
- [ ] README y documentación de consumidor apuntan a `0.5.0`.
- [ ] El commit de release contiene únicamente cambios revisados.

## GitHub y artefactos

- [ ] Push a `main` completado.
- [ ] CI verde.
- [ ] Release App verde.
- [ ] Trivy verde.
- [ ] Crear tag y release `v0.5.0` solo después de esos gates.
- [ ] Verificar la release:

```bash
gh release view v0.5.0 --repo vypdev/homeassistant-gateway
docker manifest inspect ghcr.io/vypdev/homeassistant-gateway:0.5.0
gh run list --repo vypdev/homeassistant-gateway --limit 10
```

- [ ] Confirmar `linux/amd64`, `linux/arm64` y `linux/arm/v7`.

## Smoke test autorizado

Sin mostrar ni guardar credenciales:

- [ ] `/` sin contexto Ingress → rechazo `401`.
- [ ] `/mcp/` sin Bearer → rechazo de autenticación esperado.
- [ ] `/mcp/` con cliente autorizado → `initialize` correcto.
- [ ] `tools/list` → 18 herramientas observer read-only.
- [ ] No aparecen tokens, cookies ni secretos en respuestas o logs.

## Rollback

Si el smoke test falla, no se promociona la release. Mantener disponible la imagen estable `0.4.20`, restaurar la versión desde Supervisor y repetir `/mcp/` sin token, UI Ingress y `initialize` autenticado antes de investigar.
