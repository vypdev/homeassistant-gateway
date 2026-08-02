# Solución de problemas

## `401 invalid_client_token`

El endpoint es alcanzable, pero el token falta, es incorrecto o está revocado. Genera o rota el token desde la interfaz de administración y actualiza solo el cliente correspondiente.

No reutilices el token de otro cliente ni lo incluyas en una incidencia.

## `401 ingress_identity_required`

Estás accediendo a una ruta de administración sin el contexto de Supervisor Ingress. Usa la UI desde el panel de Home Assistant. El puerto MCP directo no sustituye a Ingress para la consola.

## `421 Invalid Host header`

El `Host` usado por el cliente no está en `mcp_allowed_hosts`. Añade el hostname o IP de destino, sin puerto, guarda la configuración y reinicia la App.

La allowlist valida el destino, no la IP de origen del cliente. No añadas `ai01.lan` si la URL usa `192.168.20.101`.

## `429 development_jobs_busy`

La consola tiene el máximo de trabajos activos. Espera a que terminen o consulta sus `job_id` antes de volver a ejecutar. No se crean hilos ilimitados.

## `404 development_job_not_found`

El job expiró, fue limpiado o desapareció tras reiniciar el proceso. Los jobs son locales y no durables. Inicia una ejecución nueva.

## `503` o upstream no disponible

Home Assistant/Supervisor no respondió, agotó el timeout o devolvió un estado no utilizable. Revisa la salud del upstream desde la consola y vuelve a intentar cuando esté disponible.

## `warning` o `empty_result`

La petición llegó correctamente, pero devolvió una colección vacía o un resultado no concluyente. No es automáticamente un fallo de transporte. Comprueba el inventario, el alcance de la consulta y el estado de Home Assistant.

## MCP accesible pero sin herramientas esperadas

Comprueba el `client_id`, el perfil asignado y las capabilities efectivas mediante `tools/list`. La conectividad del modelo no demuestra que el cliente tenga permisos.

## Tras reiniciar la App

- la UI y el MCP vuelven a estar disponibles cuando Supervisor marque la App como activa;
- los jobs en memoria desaparecen;
- los tokens y clientes persistidos no deben regenerarse salvo que se hayan revocado;
- repite `initialize` y `tools/list` desde el cliente autorizado.

## Rollback

Si una actualización rompe la conectividad, conserva los datos de configuración y vuelve temporalmente a la última imagen estable (`0.4.20`) desde Supervisor. Después verifica `/mcp/` sin token (`401`), la UI por Ingress y un `initialize` autenticado antes de reintentar la actualización.
