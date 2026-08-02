# Configurar un cliente MCP

## Endpoint

Usa el destino real incluido en la URL, por ejemplo:

```text
http://192.168.20.101:18099/mcp/
```

El hostname o IP de destino debe aparecer en `mcp_allowed_hosts`. La allowlist valida el `Host` de destino; no valida la IP de origen del cliente. En la configuración se escribe el host sin puerto. La App acepta internamente el puerto publicado que use el cliente.

Si el cliente conecta mediante otro DNS, añade ese DNS. No añadas la IP de `ai01.lan` salvo que sea el destino usado en la URL.

## Crear el cliente

Desde la UI protegida por Supervisor Ingress:

1. abre **Clients**;
2. elige un nombre visible independiente;
3. selecciona el perfil `observer`;
4. concede solo las capabilities necesarias;
5. guarda el Bearer token una sola vez en el gestor seguro del cliente.

No pegues tokens en tickets, capturas, repositorios o conversaciones. La rotación invalida el token anterior y muestra uno nuevo una única vez.

## Orden de autenticación y autorización

```text
Host permitido
→ Bearer válido
→ cliente declarado
→ perfil observer/operator
→ capabilities autorizadas
→ herramienta MCP read-only
```

Un token válido no concede automáticamente todas las herramientas.

## Perfil observer

El perfil `observer` solo expone operaciones de lectura. No ejecuta servicios, scripts, automatizaciones ni cambios de configuración.

Las herramientas efectivas se comprueban mediante `tools/list`. La referencia completa está en la [guía de consumidor](README.md).

## Prueba mínima

- `GET /mcp/` sin token → `401` esperado.
- MCP `initialize` con token válido → `200`.
- `tools/list` → solo herramientas autorizadas.
- una llamada de lectura → respuesta `ok`, `warning` o `error` sanitizada.

La consola de desarrollo está protegida por Supervisor Ingress y no se publica mediante el endpoint MCP directo.

## Rotación y revocación

- **Rotate**: genera un token nuevo y deja inutilizable el anterior.
- **Revoke**: desactiva el cliente y sus tokens.
- Si un agente pierde el token, no se puede recuperar: rota el cliente.
- Si un token aparece en un log o captura, revócalo inmediatamente.
