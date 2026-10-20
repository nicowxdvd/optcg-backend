# ADR-005: Idempotencia de `POST /v1/sync` con Redis

## Contexto

`POST /v1/sync` descarga 32 archivos desde GitHub y escribe miles de filas. Es lento y costoso. Un cliente que reintenta por un timeout, o dos clics seguidos, pueden disparar dos syncs al mismo tiempo sobre las mismas tablas.

Se necesita que un mismo request lógico se ejecute una sola vez, y que los reintentos reciban el resultado original o un aviso de que sigue en curso.

Hay que decidir dos cosas:

1. Dónde se guarda el estado de cada `x-idempotency-key`.
2. Cómo se evita que dos requests concurrentes con la misma key ejecuten el sync a la vez.

## Decisión

**Almacén: Redis**, usando el cliente `ioredis` que ya provee `RedisModule` con el token `REDIS_CLIENT`.

**Mecanismo: `IdempotencyInterceptor`**, aplicado con `@UseInterceptors` solo en `SyncController.syncCards`.

- El cliente envía el header `x-idempotency-key`. Si falta, está vacío o pasa los 255 caracteres, la respuesta es 400.
- La clave en Redis es `idempotency:<key>`.
- El lock se toma con un único comando: `SET key '{"state":"in_progress"}' EX 86400 NX`.
  - `OK`: el request ganó el lock y ejecuta el handler.
  - `null`: la key ya existe y se lee su valor.
- Con el handler terminado, se guarda `{"state":"done","body":...}` con el mismo TTL de 24 horas.
- Si la key ya existe y está `done`, se devuelve el body guardado sin ejecutar el handler.
- Si la key ya existe y está `in_progress`, o expiró entre el `SET` y el `GET`, la respuesta es 409.
- Si el handler falla, se borra la key con `DEL` y se relanza el error original. El cliente puede reintentar con la misma key.

El `SET NX EX` es atómico. Con `GET` y luego `SET`, dos requests concurrentes podrían pasar los dos la comprobación.

## Alternativas consideradas

- **Tabla `idempotency_keys` en MySQL.** Garantiza durabilidad, pero cada request agrega escrituras a la base que ya soporta el sync, y la expiración exige un job de limpieza. Redis da TTL nativo y el lock atómico sin esfuerzo.
- **Huella del request (`sha256` de método, path y body) para detectar la misma key con otro body y responder 422.** Se descartó por ahora: `POST /v1/sync` no recibe body, así que la huella siempre sería la misma.
- **Responder 503 si Redis no está disponible (fail closed) o ejecutar el sync igual (fail open).** Hoy no hay manejo específico: un error de Redis se propaga como 500, y el sync no se ejecuta. Es un fail closed implícito.
- **TTL configurable por variable de entorno.** Se descartó por ahora: es una constante de 86400 segundos en el interceptor.

## Consecuencias

**A favor**

- Un mismo `x-idempotency-key` ejecuta el sync una sola vez en 24 horas, incluso con requests concurrentes.
- Los reintentos después de un éxito reciben el body original al instante.
- Un fallo no deja la key bloqueada: el `DEL` permite reintentar.

**En contra**

- El lock tiene el mismo TTL de 24 horas que el resultado. Si el proceso muere con el sync en curso, la key queda `in_progress` hasta que expire y todo reintento recibe 409. Un lock con TTL corto resolvería esto, pero exige que el TTL del lock supere la duración máxima de un sync.
- El replay devuelve solo el body. No conserva el status code original ni agrega un header `idempotent-replayed`.
- Una key reusada con otro request devuelve el resultado guardado sin avisar. Hoy es inocuo porque el endpoint no tiene body.
- Si Redis cae, `POST /v1/sync` responde 500.
- Si el interceptor se aplica a otro endpoint, la key `idempotency:<key>` es compartida. Habría que incluir método y path en la clave.

## Verificación

- `src/common/idempotency/idempotency.interceptor.spec.ts` cubre con `ioredis-mock`: header ausente, vacío y de más de 255 caracteres, primera ejecución con TTL, replay sin reejecutar, 409 con request en curso y con key expirada, `DEL` y reintento tras un error del handler.
