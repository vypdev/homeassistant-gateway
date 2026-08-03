# Developer Console: trazabilidad de lecturas

## Objetivo

La Developer Console permite verificar las operaciones de lectura del gateway y localizar si un resultado correcto, vacío, warning o error se produce en la aplicación, el transporte o Home Assistant. La trazabilidad es diagnóstica y read-only: no habilita operaciones de escritura ni amplía las capacidades MCP.

## Contrato de resultado

Cada resultado de desarrollo puede incluir:

```json
{
  "status": "ok | warning | error",
  "operation": "entity_registry",
  "duration_ms": 12,
  "count": 42,
  "reason": null,
  "details": null,
  "trace": [
    {
      "phase": "execute",
      "transport": "application",
      "status": "ok",
      "duration_ms": 12,
      "command": "entity_registry",
      "path": null,
      "attempt": 1,
      "code": null,
      "detail": "operation_completed"
    }
  ]
}
```

### Campos

- `status`: resultado semántico de la operación.
  - `ok`: lectura válida con datos.
  - `warning`: lectura válida pero vacía o parcial.
  - `error`: no se pudo completar la lectura.
- `count`: número de elementos normalizados por la aplicación.
- `reason`: razón estable y localizada por la interfaz (`empty_result`, error de upstream, parámetro inválido, etc.).
- `details`: información técnica estructurada y sanitizada. Puede incluir código, estado HTTP, ruta lógica y nombres de parámetros, pero no valores de parámetros sensibles.
- `trace`: pasos ordenados de la operación.
  - `phase`: fase (`connect`, `auth`, `command`, `normalize`, `fallback`, `error`, `execute`).
  - `transport`: canal (`websocket`, `rest`, `template`, `application`, `upstream`).
  - `command`: comando lógico de Home Assistant, nunca un frame completo.
  - `path`: ruta lógica sin query values ni tokens.
  - `attempt`: número de intento acotado.
  - `code`: código estable sanitizado.
  - `detail`: explicación técnica estable, no una excepción cruda.

La fase actual implementa WebSocket primario para:

- `config/device_registry/list`;
- `config/area_registry/list`;
- `config/floor_registry/list`;
- `config/label_registry/list`;
- `config/entity_registry/list`;
- `get_config`;
- `history/history_during_period`;
- `logbook/get`.

`states`, `services`, `events` y las comprobaciones de salud conservan REST en esta primera fase. No se declara completada la migración total hasta cubrirlos con contratos equivalentes.


## Interfaz

La consola muestra:

- contador de resultados problemáticos (`error` + `warning`);
- botón para copiar únicamente esas incidencias;
- botón de copia individual para cada resultado problemático;
- panel desplegable de trazabilidad por operación;
- duración, intentos, transporte, comando, ruta y código técnico;
- detalles estructurados cuando existe un error;
- resultado completo exportable mediante el diagnóstico general.

La copia de incidencias no ejecuta de nuevo la operación. Usa exclusivamente los resultados ya obtenidos y no incluye operaciones correctas.

## Seguridad y privacidad

Nunca deben entrar en la traza, exportación ni portapapeles:

- `SUPERVISOR_TOKEN` o tokens MCP;
- contraseñas, cookies, claves o credenciales;
- frames WebSocket completos;
- cuerpos completos de respuestas de error;
- valores de filtros sensibles;
- query strings dinámicas;
- estados o atributos no necesarios para explicar el error.

Las pruebas deben demostrar que los errores y copias solo contienen campos allowlisted.

## Verificación

Gates locales relevantes:

```bash
.venv/bin/pytest tests/test_development.py tests/test_http_api.py -q
python scripts/check_frontend_i18n.py
python scripts/check_frontend_i18n_runtime.py
cd frontend
npm run test:runtime
npm run test:ux
npm run check
npm run build
```

La prueba de contrato UX verifica que la consola conserva la separación entre resultados correctos, warnings y errores y que renderiza la trazabilidad. La validación de i18n verifica las 11 locales y la resolución runtime de los catálogos.

## Migración WebSocket

Durante la migración hacia `ws://supervisor/core/websocket`, las fases esperadas son:

```text
connect → auth → command → normalize
```

Si falla el transporte y la política permite fallback:

```text
connect → auth/command(error) → fallback(rest|template) → normalize
```

Un resultado WebSocket vacío correctamente autenticado no debe convertirse automáticamente en fallback. Un fallo de autenticación nunca debe presentarse como `empty_result`. La consola debe permitir distinguir ambos casos.
