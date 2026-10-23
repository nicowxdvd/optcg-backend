# ADR-006: Caché de `GET /v1/cards` con Redis

## Contexto

`GET /v1/cards` consulta MySQL en cada request, con filtros por `name` y `code` y paginación. Los datos solo cambian cuando corre `POST /v1/sync`, que es poco frecuente. El mismo listado se pide muchas veces entre dos syncs.

Hay que decidir cuatro cosas:

1. Dónde vive la caché y en qué capa se aplica.
2. Cómo se arma la key de cada listado.
3. Cómo se invalida cuando corre un sync.
4. Qué pasa si Redis no responde.

## Decisión

**Almacén: Redis**, con el cliente `ioredis` que ya provee `RedisModule` con el token `REDIS_CLIENT`.

**Capa: cache-aside en `CardsService.list`**, con una clase `CardsListCache` (`src/cards/cache/cards-list.cache.ts`).

- `get`: busca el listado. Si no hay nada, devuelve `null`.
- Miss: el service consulta MySQL, arma el `PaginatedCardsDto` y llama a `set`.
- `set`: guarda el JSON con `SET key value EX <TTL>`. El TTL sale de `CARDS_CACHE_TTL_SECONDS` (3600 por defecto).
- Si `findPage` lanza, no se llega al `set`: los errores no se cachean.

**Key con versión:** `cards:list:v<version>:<hash>`.

- `<version>` es el valor de `cards:list:version`. Si la key no existe, se usa `0`.
- `<hash>` es el `sha256` de `JSON.stringify({ page, limit, name, code })`, en ese orden.
- `name` se pasa a minúsculas antes de hashear, porque MySQL compara sin distinguir mayúsculas. Así `Luffy` y `luffy` comparten entrada. `code` ya llega en mayúsculas desde el DTO.

**Invalidación por versión:** al terminar `SyncService.syncCards`, si al menos un archivo no se omitió (`files.length - skipped > 0`), se ejecuta `INCR cards:list:version`.

- Las keys con la versión anterior dejan de coincidir y vencen solas por TTL.
- `INCR` es atómico y crea la key en 1 si no existe.
- La key de versión no tiene TTL. Si venciera, volvería a `0` y podría reactivar entradas viejas que aún no vencieron.
- Se invalida aunque algún archivo haya fallado: los archivos anteriores sí se guardaron en MySQL, y `syncFile` atrapa sus errores.

**Fail open:** si Redis falla, `CardsListCache` atrapa el error, loguea un `warn` y sigue.

- `get` devuelve `null`: el service lo trata como un miss y lee de MySQL.
- `set` no hace nada: la respuesta ya está calculada.
- Un valor corrupto en Redis hace fallar `JSON.parse`, y se trata igual que un miss.
- El `try/catch` rodea solo las llamadas a Redis. Un error de MySQL sigue llegando al cliente.
- `invalidate` también atrapa el error y loguea un `error`. El sync no falla.

## Alternativas consideradas

- **Invalidar con `SCAN` y `DEL` sobre `cards:list:*`.** Obliga a recorrer las keys en cada sync, y `KEYS` bloquea Redis. La versión se resuelve con un solo comando y sin recorrer nada. El costo es que las keys viejas quedan hasta que vence el TTL.
- **Decorator o caché dentro del repositorio.** Mezcla una decisión de caché con el acceso a datos, y el repositorio devuelve entidades de TypeORM, que no son JSON plano. En el service ya se tiene el `PaginatedCardsDto` listo para serializar.
- **`@nestjs/cache-manager`.** Agrega una dependencia y una abstracción para un solo uso. Con `ioredis` y tres métodos alcanza.
- **Solo TTL, sin invalidación.** Después de un sync, el listado serviría datos viejos hasta una hora.
- **Fail closed (responder 503 si Redis cae).** Es lo que hace la idempotencia (ADR 005), porque sin Redis no hay garantía. Acá Redis es solo una optimización: el listado debe seguir funcionando sin él.
- **Versión con timestamp (`SET` con `Date.now()`) en vez de `INCR`.** Depende del reloj del servidor. Si retrocede, podría repetir una versión anterior y reactivar keys viejas. Dos invalidaciones en el mismo milisegundo darían la misma versión.

## Consecuencias

**A favor**

- Un hit no toca MySQL.
- Después de un sync con cambios, el listado se recalcula sin recorrer ni borrar keys.
- Con Redis caído, `GET /v1/cards` responde igual desde MySQL.
- El service no sabe si Redis está caído: `CardsListCache` absorbe el error.

**En contra**

- **Viajes a Redis por request:** un hit hace 2 (`GET` de la versión y `GET` de la key). Un miss hace 4, porque `get` y `set` calculan la key por separado y cada uno lee la versión. Con Upstash, que está en internet, cada viaje cuesta latencia. En local, con Postman, el primer request tardó unos 340 ms y los siguientes entre 120 y 170 ms. Si MySQL queda cerca de la API y Redis lejos, la caché puede dar poca ganancia. Conviene que API y Redis estén en la misma región.
- **Consumo de comandos:** Upstash free tiene una cuota mensual de comandos. Cada request gasta entre 2 y 4.
- **Cache stampede:** cuando una key vence, o justo después de un sync, varios requests iguales y simultáneos hacen miss a la vez y todos consultan MySQL. No hay datos incorrectos, solo un pico de carga. Hoy es aceptable: una sola instancia, consultas paginadas y baratas. Si aparece carga, hay dos salidas: unificar las consultas en curso con un `Map<key, Promise>` en memoria dentro del service, o un lock en Redis con `SET key:lock token NX EX`, que cubre varias instancias pero exige decidir TTL del lock, espera máxima y qué hacer si quien lo tiene muere.
- **Datos viejos si falla la invalidación:** si Redis está caído mientras corre un sync, el `INCR` falla y se loguea. La caché sirve datos anteriores hasta que venza el TTL, como máximo una hora con el valor por defecto.
- **Keys huérfanas:** tras cada invalidación, las entradas de la versión anterior ocupan memoria hasta que vencen.
- **Orden de lectura de la versión:** si un sync hace `INCR` entre el `get` y el `set` de un mismo request, el `set` escribe en una key de la versión vieja, que nadie vuelve a leer. Es inofensivo.
- **Sync sin cambios:** si todos los archivos se omiten, no se invalida. Si los datos de MySQL se modifican por otra vía, la caché no se entera.

## Verificación

- `src/cards/cache/cards-list.cache.spec.ts` cubre con `ioredis-mock`: miss y hit, TTL de la key, `name` en mayúsculas y minúsculas con la misma key, queries distintos con keys distintas, `invalidate` que sube la versión e impide encontrar lo guardado, valor corrupto tratado como miss, y Redis roto sin lanzar errores en `get`, `set` e `invalidate`.
- `src/cards/cards.service.spec.ts` cubre: un hit no llama al repositorio, un miss consulta y guarda, y un error del repositorio no guarda.
- `test/cards.e2e-spec.ts` cubre: dos GET iguales consultan el repositorio una sola vez, filtros distintos no comparten caché, `name` normalizado comparte caché, `invalidate` fuerza una nueva consulta y un 400 no llega al repositorio.
- Manual en Docker: dos GET seguidos dejan una key `cards:list:v0:<hash>` con TTL en Redis.
- Sin cubrir por tests: que `SyncService` invoque `invalidate` solo cuando se sincroniza al menos un archivo. `SyncService` no tiene spec.
