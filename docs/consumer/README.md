# Home Assistant Gateway — guía de consumidor

Home Assistant Gateway es una App gestionada por Home Assistant Supervisor que expone una superficie MCP **read-only** para clientes como Hermes u OpenClaw.

La administración web permanece detrás de **Supervisor Ingress**. El transporte MCP puede exponerse directamente por HTTP mediante `/mcp/`, siempre protegido por Bearer token y `mcp_allowed_hosts`.

## Qué permite

- consultar inventario, estados, registros, historial y diagnósticos acotados;
- descubrir las herramientas MCP autorizadas del perfil `observer`;
- verificar la conectividad desde la Development Console;
- revisar resultados parciales, colecciones vacías y reportes históricos;
- mantener tokens independientes por cliente.

## Qué no permite

- ejecutar servicios de Home Assistant;
- modificar automatizaciones o configuraciones;
- ejecutar shell, Docker socket, SSH o escaneos de red;
- usar un token de un cliente para acceder a otro;
- recuperar tokens almacenados: se muestran únicamente durante su emisión o rotación.

## Instalación rápida

1. Añade el repositorio de la App en Home Assistant.
2. Instala **Home Assistant Gateway** desde Supervisor.
3. Configura el puerto MCP y reinicia la App.
4. Configura `mcp_allowed_hosts` con los destinos que usarán los clientes, sin `*` global.
5. Crea un cliente independiente con perfil `observer` y las capabilities mínimas.
6. Configura el cliente MCP con la URL `/mcp/` y su Bearer token.

## Ingress frente a MCP directo

| Superficie | Uso | Protección |
|---|---|---|
| Supervisor Ingress | UI, administración y APIs `/api/*` | identidad de Supervisor Ingress |
| `/mcp/` directo | transporte MCP para agentes | `Host` permitido + Bearer + policy del cliente |

El puerto MCP directo no publica la consola administrativa. Una respuesta `401` en `/mcp/` sin token es esperada y confirma que la autenticación está activa.

## Perfil observer y herramientas

El perfil `observer` es read-only y puede exponer hasta estas 18 herramientas, según las capabilities del cliente:

```text
gateway_diagnostics
ha_inventory
ha_states
ha_automations
ha_configuration
ha_history
ha_logbook
ha_devices
ha_areas
ha_floors
ha_labels
ha_entity_registry
ha_scripts
ha_scenes
ha_helpers
ha_integrations
ha_services
ha_events
```

La lista efectiva debe verificarse con `tools/list`; la conectividad del modelo no demuestra permisos.

## Comportamiento de resultados

- `ok`: lectura correcta, incluso si contiene cero elementos cuando el recurso no usa la semántica `empty_result`.
- `warning` con `reason="empty_result"`: consulta válida que no encontró elementos.
- `error`: fallo de transporte, upstream, formato o autorización.
- jobs de Development Console: locales al proceso, bounded y no durables; se pierden al reiniciar la App.

## Verificación mínima

1. `GET /mcp/` sin token → `401` esperado.
2. MCP `initialize` autenticado → `200`.
3. `tools/list` → herramientas autorizadas para ese cliente.
4. UI por Ingress → `/health` y consola disponibles dentro de Supervisor.

Consulta también:

- [Configuración de clientes MCP](configure-mcp-client.md)
- [Solución de problemas](troubleshooting.md)
- [Modelo de seguridad](../security-model.md)
- [Arquitectura](../architecture.md)
