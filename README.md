# Home Assistant Gateway

[![CI](https://github.com/vypdev/homeassistant-gateway/actions/workflows/ci.yml/badge.svg)](https://github.com/vypdev/homeassistant-gateway/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/vypdev/homeassistant-gateway?sort=semver)](https://github.com/vypdev/homeassistant-gateway/releases)

**Home Assistant Gateway** es un add-on de Home Assistant que ofrece una interfaz MCP segura, acotada y auditable para que clientes como Hermes u OpenClaw consulten una instalación de Home Assistant.

La superficie predeterminada es **observer/read-only**: inventario, estados, registros, historial, logbook, diagnósticos y metadatos. La administración se realiza desde Home Assistant Ingress y el transporte MCP directo se protege con `Host` allowlist, Bearer token, identidad de cliente y capabilities.

> **Estado actual:** `v0.5.9`. Operator permanece deshabilitado: **No operator mutation is enabled yet**. No hay herramientas MCP de escritura registradas.

## Cómo se usa

### 1. Instalar el add-on

1. Añade este repositorio al almacén de add-ons de Home Assistant.
2. Instala **Home Assistant Gateway**.
3. Abre la interfaz desde **Open Web UI**; la consola de administración está protegida por Supervisor Ingress.
4. Mantén `operator_enabled: false` salvo que exista una provisión explícita para una futura capacidad de escritura.

### 2. Crear un cliente observer

Desde la consola Ingress:

1. abre **Clients**;
2. crea un cliente independiente para cada agente;
3. selecciona el perfil `observer`;
4. concede solo las capabilities necesarias;
5. guarda el token cuando se muestra: no se puede recuperar después.

Los tokens son independientes por cliente. Para un token perdido o expuesto, usa **Rotate** o **Revoke**.

### 3. Conectar un cliente MCP

Configura `mcp_allowed_hosts` con los hosts de destino usados en la URL, sin puerto y sin `*` global. Por ejemplo:

```text
localhost,127.0.0.1,[::1],homeassistant,homeassistant.local
```

Usa el puerto publicado por el add-on y la ruta `/mcp/`:

```text
http://<home-assistant-host>:18099/mcp/
```

El cliente debe enviar su token como:

```http
Authorization: Bearer <observer-client-token>
```

La comprobación mínima es:

1. `/mcp/` sin token → `401` esperado;
2. `initialize` autenticado → correcto;
3. `tools/list` → solo las herramientas autorizadas para ese cliente;
4. una lectura → resultado `ok`, `warning` o `error` sanitizado.

El endpoint MCP directo no publica la consola administrativa. La Development Console se usa desde Ingress para verificar conectividad, resultados vacíos, fallos y trazabilidad de las lecturas.

## Qué expone

El perfil observer puede exponer, según las capabilities del cliente, herramientas read-only como:

```text
gateway_diagnostics  ha_inventory       ha_states
ha_automations       ha_configuration    ha_history
ha_logbook           ha_services        ha_events
ha_devices           ha_areas           ha_floors
ha_labels            ha_entity_registry ha_scripts
ha_scenes            ha_helpers         ha_integrations
```

La lista efectiva siempre se comprueba con `tools/list`; que un cliente conecte no demuestra que tenga todos los permisos.

## Seguridad y límites

- No se ejecutan servicios de Home Assistant ni se modifican automatizaciones o configuración.
- No se ofrece shell arbitrario, Docker socket, SSH, escaneo de red ni proxy transparente de APIs.
- Los secretos no aparecen en prompts, resultados MCP, logs, auditorías, snapshots ni Git.
- Los resultados son bounded y distinguen lecturas correctas, colecciones vacías (`warning`/`empty_result`) y fallos de upstream o transporte.
- Las ejecuciones de Development Console son locales al proceso, bounded y no durables; se pierden al reiniciar el add-on.

## Índice de documentación

### Empezar como consumidor

- [Guía de consumidor](docs/consumer/README.md) — instalación, superficies, herramientas y verificación mínima.
- [Configurar un cliente MCP](docs/consumer/configure-mcp-client.md) — endpoint, tokens, capabilities, rotación y revocación.
- [Solución de problemas](docs/consumer/troubleshooting.md) — síntomas, causas y comprobaciones.
- [Integración con OpenClaw y Hermes](docs/integration-with-openclaw-and-hermes.md) — perfiles y conexión de agentes.

### Entender el producto

- [Arquitectura](docs/architecture.md) — límites Clean Architecture, puertos, adaptadores y composición.
- [Modelo de seguridad](docs/security-model.md) — amenazas, perfiles, credenciales, red y auditoría.
- [Contratos de Home Assistant](docs/home-assistant-platform-contracts.md) — APIs, WebSocket, Supervisor e Ingress.
- [Diseño frontend](docs/frontend-design.md) — shell, Ingress, accesibilidad, temas e i18n.

### Development Console y operación

- [Development Console](docs/development-console.md) — operaciones, packs, jobs y resultados.
- [Trazabilidad de la Development Console](docs/development-console-traceability.md) — evidencia, errores, warnings, comparaciones y exportación.
- [Frontend y credenciales](docs/frontend-and-credentials.md) — límites de la UI y manejo de tokens.
- [Live smoke](docs/live-smoke.md) — verificación contra un target autorizado.

### Planificación y releases

- [Roadmap](docs/roadmap.md) — evolución prevista y límites actuales.
- [Release 0.5.0](docs/release-0.5.0.md) — histórico de la refactorización arquitectónica.
- [ADR: Home Assistant como target principal](docs/adr/0001-home-assistant-native.md) — decisión de producto y despliegue.

## Desarrollo local

```bash
python -m pytest
.venv/bin/ruff check src tests scripts
npm --prefix frontend run check
npm --prefix frontend run build
```

Consulta la documentación de arquitectura y las guías de consumidor antes de modificar contratos MCP, perfiles o límites de seguridad.

## Licencia

MIT. Consulta [`LICENSE`](LICENSE).
