# optcg-backend

Backend NestJS para OPTCG.

## Comandos

```bash
npm install
npm run start:dev
npm run test
npm run test:e2e
```

## Levantar Redis local

```bash
cp .env.example .env
npm run redis:up
npm run redis:cli
npm run redis:down
```

`REDIS_URL` local: `redis://localhost:6379`. En producción usar la URL `rediss://` de Upstash.
