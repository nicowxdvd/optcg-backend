import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import RedisMock from 'ioredis-mock';
import request from 'supertest';
import { IdempotencyInterceptor } from '../src/common/idempotency/idempotency.interceptor';
import { REDIS_CLIENT } from '../src/redis/redis.constants';
import { SyncController } from '../src/sync/sync.controller';
import { SyncService } from '../src/sync/sync.service';
import { UploadsController } from '../src/uploads/uploads.controller';
import { UploadsService } from '../src/uploads/uploads.service';

// @nestjs/typeorm 12 es ESM puro y jest (CommonJS) no lo carga; solo se necesita el decorador
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

// @nestjs/config y @nestjs/axios también son ESM puros; aquí solo se usan como tokens de inyección
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('@nestjs/axios', () => ({ HttpService: class {} }));

const validUpload = { contentType: 'image/png', size: 1024 };

describe('Rate limiting (e2e)', () => {

  let app: INestApplication;
  let redis: InstanceType<typeof RedisMock>;
  let uploads: { create: jest.Mock; get: jest.Mock };
  let syncService: { syncCards: jest.Mock };

  beforeEach(async () => {
    uploads     = { create: jest.fn().mockResolvedValue({ id: 'abc' }), get: jest.fn().mockResolvedValue({ id: 'abc' }) };
    syncService = { syncCards: jest.fn().mockResolvedValue(undefined) };

    redis = new RedisMock();
    await redis.flushall();

    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }] })],
      controllers: [UploadsController, SyncController],
      providers: [
        IdempotencyInterceptor,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: UploadsService, useValue: uploads },
        { provide: SyncService, useValue: syncService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

  });


  afterEach(async () => {
    await app.close();

  });


  describe('POST /v1/uploads (10 por minuto)', () => {

    it('las primeras 10 requests pasan y la 11 devuelve 429', async () => {
      for (let i = 0; i < 10; i++)
        await request(app.getHttpServer()).post('/v1/uploads').send(validUpload).expect(201);

      await request(app.getHttpServer()).post('/v1/uploads').send(validUpload).expect(429);

      expect(uploads.create).toHaveBeenCalledTimes(10);

    });


    it('el 429 incluye la cabecera Retry-After', async () => {
      for (let i = 0; i < 10; i++)
        await request(app.getHttpServer()).post('/v1/uploads').send(validUpload);

      const response = await request(app.getHttpServer()).post('/v1/uploads').send(validUpload).expect(429);

      expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);

    });


    it('las requests que fallan la validación también cuentan', async () => {
      for (let i = 0; i < 10; i++)
        await request(app.getHttpServer()).post('/v1/uploads').send({ contentType: 'text/plain', size: 1 }).expect(400);

      await request(app.getHttpServer()).post('/v1/uploads').send(validUpload).expect(429);

      expect(uploads.create).not.toHaveBeenCalled();

    });

  });


  describe('POST /v1/sync (2 por minuto)', () => {

    const sync = (key: string) => request(app.getHttpServer()).post('/v1/sync').set('x-idempotency-key', key);

    it('las primeras 2 requests pasan y la 3 devuelve 429', async () => {
      await sync('key-1').expect(201);
      await sync('key-2').expect(201);
      await sync('key-3').expect(429);

      expect(syncService.syncCards).toHaveBeenCalledTimes(2);

    });


    it('una request limitada no llega al interceptor de idempotencia', async () => {
      await sync('key-1').expect(201);
      await sync('key-2').expect(201);
      await sync('key-3').expect(429);

      expect(await redis.exists('idempotency:key-3')).toBe(0);

    });

  });


  describe('límite global (100 por minuto)', () => {

    it('GET /v1/uploads/:id devuelve 429 a partir de la request 101', async () => {
      const id = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';

      for (let i = 0; i < 100; i++)
        await request(app.getHttpServer()).get(`/v1/uploads/${id}`).expect(200);

      await request(app.getHttpServer()).get(`/v1/uploads/${id}`).expect(429);

    });

  });


  describe('contadores independientes por ruta', () => {

    it('agotar el límite de POST /v1/uploads no afecta a GET /v1/uploads/:id', async () => {
      for (let i = 0; i < 11; i++)
        await request(app.getHttpServer()).post('/v1/uploads').send(validUpload);

      await request(app.getHttpServer()).get('/v1/uploads/3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b').expect(200);

    });

  });

});
