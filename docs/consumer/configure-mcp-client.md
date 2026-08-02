# Configurar un cliente MCP

## Endpoint

Usa el destino real incluido en la URL, por ejemplo:

```text
http://192.168.20.101:18099/mcp/
```

El valor `192.168.20.101` debe aparecer en `mcp_allowed_hosts`. La allowlist valida el `Host` de destino; no valida la IP de origen del cliente. No se añade el puerto.

## Autenticación

Cada cliente tiene su propio Bearer token. No compartas tokens entre Hermes, OpenClaw u otros agentes y no los incluyas en tickets, capturas ni conversaciones.

La evaluación ocurre en este orden:

```text
Host permitido
→ Bearer válido
→ cliente declarado
→ perfil observer/operator
→ capabilities autorizadas
```

## Perfil observer

El perfil `observer` solo expone herramientas de lectura. Es el perfil recomendado para agentes domésticos y automatizaciones de consulta.

## Prueba mínima

- `GET /mcp/` sin token → `401` esperado.
- MCP `initialize` con token válido → respuesta `200`.
- `tools/list` → solo herramientas autorizadas para ese cliente.

La consola de desarrollo está protegida por Supervisor Ingress y no se publica mediante el endpoint MCP directo.
