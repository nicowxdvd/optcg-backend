# ADR-004: Una transacción por archivo con UnitOfWork

## Contexto

El sync descarga 32 archivos JSON de la API de GitHub. Por cada archivo escribe el set, los traits, los líderes y las cartas, y al final marca el archivo como sincronizado en `sync_files`.

Sin transacción, un fallo a mitad de un archivo deja datos a medias: por ejemplo, líderes guardados y cartas sin guardar. Además `sync_files` quedaría sin reflejar qué se escribió realmente.

Hay que decidir dos cosas:

1. Qué alcance tiene la transacción (por carta, por archivo o por lote).
2. Cómo llegan los repositorios a participar de ella sin que el servicio dependa de TypeORM.

## Decisión

**Alcance: una transacción por archivo.**

- Dentro de la transacción: upsert del set, traits, líderes, cartas y `markSynced`.
- Fuera de la transacción: la descarga HTTP, las validaciones de `raw`, `markPending` y `markFailed`.
  - La descarga queda fuera para no mantener una transacción abierta durante I/O de red.
  - `markFailed` queda fuera para que el estado `FAILED` sobreviva al rollback.

**Propagación: puerto `UnitOfWorkPort`.**

- `run(work)` abre la transacción y le entrega al callback todos los repositorios ya ligados a ella: `{ cardSets, syncFiles, traits, leaders, cards }`.
- El adaptador `TypeOrmUnitOfWork` usa `DataSource.transaction` y construye cada repositorio con `manager.getRepository(...)`.
- `CardsService` solo conoce la interfaz, inyectada con el token `UNIT_OF_WORK`.

**Se quitó la transacción interna de `upsertMany`** en `LeaderRepository` y `CardRepository`. TypeORM 1.1.1 con MySQL convertía esa transacción anidada en un `SAVEPOINT`. No fallaba, pero dejaba dos límites de transacción en el mismo flujo. Ahora el único límite lo define la unidad de trabajo.

## Alternativas consideradas

- **Transacción por carta.** Se guarda todo lo válido y se reporta lo que falló. Se descartó: son miles de transacciones y un archivo puede quedar guardado a medias, lo que complica decidir si un archivo está sincronizado.
- **Transacción por lote (todos los archivos).** Si una carta falla, no se guarda nada. Se descartó: un solo error tira los 32 archivos y mantiene la transacción abierta durante toda la descarga.
- **`EntityManager` por parámetro.** Funciona, pero filtra TypeORM a las firmas de los puertos y obliga a pasar el manager por cada método.
- **`AsyncLocalStorage`.** Evita pasar parámetros, pero la dependencia de la transacción queda implícita, y es difícil de leer y de probar.

## Consecuencias

**A favor**

- Un archivo se guarda completo o no se guarda. `sync_files` solo dice `SYNCED` si todo el contenido quedó escrito.
- Un archivo con error no impide sincronizar los demás, y se puede reintentar solo.
- `CardsService` no conoce TypeORM. En un test se puede reemplazar el `UnitOfWorkPort` por uno falso.

**En contra**

- El resultado global puede ser parcial: algunos archivos `SYNCED` y otros `FAILED`. La respuesta de `POST /v1/cards/sync` debe reflejarlo (pendiente: DTO de respuesta).
- Cada repositorio se construye dos veces: una vez para uso normal y otra dentro de `TypeOrmUnitOfWork`. Agregar un repositorio al flujo transaccional exige tocar `TransactionalRepositories` y el adaptador.

## Verificación

- Se forzó un error después de `leaders.upsertMany`: la tabla `leaders` no ganó filas y el archivo quedó `FAILED`.
- Una corrida normal sobre base limpia dio los mismos conteos que antes de la transacción (2813 cartas, 235 líderes).
- Una segunda corrida omitió los 32 archivos por sha sin cambios.
