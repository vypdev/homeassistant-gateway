# Home Assistant Gateway — guía de consumidor

Home Assistant Gateway expone una superficie MCP **read-only** para clientes como Hermes u OpenClaw. Mantiene la identidad y las capacidades por cliente, protege la consola mediante Supervisor Ingress y separa el transporte MCP directo de la interfaz de administración.

## Qué permite

- consultar inventario, estados, registros y diagnósticos acotados;
- descubrir herramientas MCP del perfil `observer`;
- verificar la conectividad del Gateway desde la consola de desarrollo;
- revisar resultados parciales y reportes históricos.

## Qué no permite

- ejecutar servicios de Home Assistant;
- modificar automatizaciones o configuraciones;
- ejecutar shell, Docker socket, SSH o escaneos de red;
- usar un token de un cliente para acceder a otro.

## Instalación rápida

1. Añade el repositorio de la App en Home Assistant.
2. Instala **Home Assistant Gateway**.
3. Configura el puerto MCP y `mcp_allowed_hosts`.
4. Crea un cliente con perfil `observer` y las capacidades necesarias.
5. Configura el cliente MCP con la URL `/mcp/` y su Bearer token.

## Verificación

Una respuesta `401` en `/mcp/` sin token es esperada: demuestra que el límite de autenticación está activo. Con un token válido, `initialize` debe devolver las herramientas del perfil autorizado.

Consulta también:

- [Configuración de clientes MCP](configure-mcp-client.md)
- [Hermes](hermes.md)
- [Modelo de seguridad](security-model.md)
- [Solución de problemas](troubleshooting.md)
