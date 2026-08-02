# Solución de problemas

## `401 invalid_client_token`

El endpoint es alcanzable, pero el token falta, es incorrecto o está revocado. Genera o rota el token desde la interfaz de administración y actualiza solo el cliente correspondiente.

## `401 ingress_identity_required`

Estás accediendo a una ruta de administración sin el contexto de Supervisor Ingress. El puerto MCP directo no sustituye a Ingress para la UI.

## `421 Invalid Host header`

El `Host` usado por el cliente no está en `mcp_allowed_hosts`. Añade el hostname o IP de destino, sin puerto, guarda la configuración y reinicia la App.

## `429 development_jobs_busy`

La consola ya tiene dos trabajos activos. Espera a que terminen o consulta sus `job_id` antes de volver a ejecutar.

## `404 development_job_not_found`

El job expiró, fue limpiado o desapareció tras reiniciar el proceso. Inicia una ejecución nueva.

## `warning` o `empty_result`

La petición llegó correctamente, pero devolvió una colección vacía o un resultado no concluyente. No debe interpretarse automáticamente como fallo de transporte. Comprueba el inventario, el alcance de la consulta y el estado de Home Assistant.

## MCP accesible pero sin herramientas esperadas

Comprueba el `client_id`, el perfil asignado y las capabilities efectivas. La conectividad del modelo no demuestra por sí misma que el cliente tenga permisos.
