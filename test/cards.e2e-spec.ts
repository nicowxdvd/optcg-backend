import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import RedisMock from 'ioredis-mock';
import request from 'supertest';
import { Between, LessThanOrEqual, Like, MoreThanOrEqual, Repository } from 'typeorm';
import { CardsListCache } from '../src/cards/cache/cards-list.cache';
import { CardsController } from '../src/cards/cards.controller';
import { CardsService } from '../src/cards/cards.service';
import { CardEntity } from '../src/cards/entities/card.entity';
import { CardType } from '../src/cards/enums/card-type.enum';
import { CARDS_READ_REPOSITORY } from '../src/cards/ports/cards-read.repository.port';
import { CardsReadRepository } from '../src/cards/repositories/cards-read.repository';
import { REDIS_CLIENT } from '../src/redis/redis.constants';

const makeCard = (externalId: string, cardCode: string) => ({ externalId, cardCode, name: 'Luffy', type: CardType.CHARACTER, rarity: 'R', color: 'Red', cost: 5, power: 7000, counterValue: null, attribute: 'Ranged', effect: null, triggerEffect: null, imageUrl: 'https://img/luffy.png' }) as CardEntity;

// @nestjs/typeorm 12 es ESM puro y jest (CommonJS) no lo carga; solo se necesita el decorador
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

// @nestjs/config también es ESM puro; CardsListCache solo lo usa como token de inyección
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

describe('GET /v1/cards (e2e)', () => {

  let app: INestApplication;
  let findAndCount: jest.Mock;
  let cache: CardsListCache;

  beforeEach(async () => {
    findAndCount = jest.fn().mockResolvedValue([[], 0]);

    const redis = new RedisMock();
    await redis.flushall();

    const moduleRef = await Test.createTestingModule({
      controllers: [CardsController],
      providers: [
        CardsService,
        CardsListCache,
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(3600) } },
        { provide: CARDS_READ_REPOSITORY, useFactory: () => new CardsReadRepository({ findAndCount } as unknown as Repository<CardEntity>) },
      ],
    }).compile();

    cache = moduleRef.get(CardsListCache);

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

  });


  afterEach(async () => {
    await app.close();

  });


  it('code exacto devuelve la carta y sus variantes', async () => {
    const items = [makeCard('OP01-001', 'OP01-001'), makeCard('OP01-001_p1', 'OP01-001')];
    findAndCount.mockResolvedValue([items, 2]);

    const response = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01-001' }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cardCode: Like('OP01-001%') } }));
    expect(response.body.total).toBe(2);
    expect(response.body.items.map((item: { externalId: string }) => item.externalId)).toEqual(['OP01-001', 'OP01-001_p1']);

  });


  it('code en minúsculas se normaliza a mayúsculas', async () => {
    await request(app.getHttpServer()).get('/v1/cards').query({ code: 'op01-001' }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cardCode: Like('OP01-001%') } }));

  });


  it('prefijo de set devuelve todo el set', async () => {
    const items = [makeCard('OP01-001', 'OP01-001'), makeCard('OP01-002', 'OP01-002'), makeCard('OP01-003', 'OP01-003')];
    findAndCount.mockResolvedValue([items, 3]);

    const response = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01' }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cardCode: Like('OP01%') } }));
    expect(response.body.items).toHaveLength(3);

  });


  it('combina code con name y paginación', async () => {
    findAndCount.mockResolvedValue([[], 12]);

    const response = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01', name: 'luffy', page: 2, limit: 5 }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith({ where: { name: Like('%luffy%'), cardCode: Like('OP01%') }, order: { cardCode: 'ASC', id: 'ASC' }, skip: 5, take: 5 });
    expect(response.body).toMatchObject({ total: 12, page: 2, totalPages: 3 });

  });


  it('code vacío no filtra', async () => {
    await request(app.getHttpServer()).get('/v1/cards').query({ code: '' }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));

  });


  it('code de más de 20 caracteres devuelve 400', async () => {
    const response = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'A'.repeat(21) }).expect(400);

    expect(response.body.message).toContain('code debe tener como máximo 20 caracteres');
    expect(findAndCount).not.toHaveBeenCalled();

  });


  describe('filtro por coste', () => {

    const orderBy = { cardCode: 'ASC', id: 'ASC' };

    it('cost filtra por valor exacto', async () => {
      findAndCount.mockResolvedValue([[makeCard('OP01-001', 'OP01-001')], 1]);

      const response = await request(app.getHttpServer()).get('/v1/cards').query({ cost: 3 }).expect(200);

      expect(findAndCount).toHaveBeenCalledWith({ where: { cost: 3 }, order: orderBy, skip: 0, take: 20 });
      expect(response.body.total).toBe(1);

    });


    it('cost=0 filtra por coste 0', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ cost: 0 }).expect(200);

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cost: 0 } }));

    });


    it('costMin y costMax filtran por rango', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 2, costMax: 5 }).expect(200);

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cost: Between(2, 5) } }));

    });


    it('costMin igual a costMax se acepta', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 3, costMax: 3 }).expect(200);

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cost: Between(3, 3) } }));

    });


    it('solo costMin filtra desde ese valor', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 4 }).expect(200);

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cost: MoreThanOrEqual(4) } }));

    });


    it('solo costMax filtra hasta ese valor', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ costMax: 4 }).expect(200);

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cost: LessThanOrEqual(4) } }));

    });


    it('cost vacío no filtra', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ cost: '', costMin: '', costMax: '' }).expect(200);

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));

    });


    it('combina el rango de coste con name, code y paginación', async () => {
      findAndCount.mockResolvedValue([[], 12]);

      const response = await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 2, costMax: 5, name: 'luffy', code: 'OP01', page: 2, limit: 5 }).expect(200);

      expect(findAndCount).toHaveBeenCalledWith({ where: { name: Like('%luffy%'), cardCode: Like('OP01%'), cost: Between(2, 5) }, order: orderBy, skip: 5, take: 5 });
      expect(response.body).toMatchObject({ total: 12, page: 2, totalPages: 3 });

    });


    it('combina cost exacto con name y paginación', async () => {
      findAndCount.mockResolvedValue([[], 7]);

      const response = await request(app.getHttpServer()).get('/v1/cards').query({ cost: 4, name: 'lu', page: 2, limit: 5 }).expect(200);

      expect(findAndCount).toHaveBeenCalledWith({ where: { name: Like('%lu%'), cost: 4 }, order: orderBy, skip: 5, take: 5 });
      expect(response.body).toMatchObject({ total: 7, page: 2, totalPages: 2 });

    });


    it.each(['abc', '1.5', '3abc', 'NaN'])('cost=%s devuelve 400', async (value) => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ cost: value }).expect(400);

      expect(response.body.message).toContain('cost debe ser un número entero');
      expect(findAndCount).not.toHaveBeenCalled();

    });


    it('costMin no numérico devuelve 400', async () => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 'abc' }).expect(400);

      expect(response.body.message).toContain('costMin debe ser un número entero');
      expect(findAndCount).not.toHaveBeenCalled();

    });


    it('costMax no numérico devuelve 400', async () => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ costMax: 'abc' }).expect(400);

      expect(response.body.message).toContain('costMax debe ser un número entero');
      expect(findAndCount).not.toHaveBeenCalled();

    });


    it('cost negativo devuelve 400', async () => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ cost: -1 }).expect(400);

      expect(response.body.message).toContain('cost debe ser mayor o igual a 0');
      expect(findAndCount).not.toHaveBeenCalled();

    });


    it('costMin mayor que costMax devuelve 400', async () => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 5, costMax: 2 }).expect(400);

      expect(response.body.message).toContain('costMax debe ser mayor o igual a costMin');
      expect(findAndCount).not.toHaveBeenCalled();

    });


    it.each([{ costMin: 1 }, { costMax: 5 }, { costMin: 1, costMax: 5 }])('cost junto con %p devuelve 400', async (range) => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ cost: 3, ...range }).expect(400);

      expect(response.body.message).toContain('cost no se puede combinar con costMin ni costMax');
      expect(findAndCount).not.toHaveBeenCalled();

    });

  });


  describe('caché', () => {

    it('dos GET iguales consultan el repositorio una sola vez', async () => {
      findAndCount.mockResolvedValue([[makeCard('OP01-001', 'OP01-001')], 1]);

      const first  = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01-001' }).expect(200);
      const second = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01-001' }).expect(200);

      expect(findAndCount).toHaveBeenCalledTimes(1);
      expect(second.body).toEqual(first.body);

    });


    it('GET con filtros distintos no comparten caché', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01' }).expect(200);
      await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP02' }).expect(200);

      expect(findAndCount).toHaveBeenCalledTimes(2);

    });


    it('cost distinto no comparte caché', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ cost: 3 }).expect(200);
      await request(app.getHttpServer()).get('/v1/cards').query({ cost: 5 }).expect(200);

      expect(findAndCount).toHaveBeenCalledTimes(2);

    });


    it('rangos de coste distintos no comparten caché', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 2, costMax: 5 }).expect(200);
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 2, costMax: 6 }).expect(200);

      expect(findAndCount).toHaveBeenCalledTimes(2);

    });


    it('dos GET con el mismo coste consultan el repositorio una sola vez', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 2, costMax: 5 }).expect(200);
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 2, costMax: 5 }).expect(200);

      expect(findAndCount).toHaveBeenCalledTimes(1);

    });


    it('name en mayúsculas y minúsculas comparte caché', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ name: 'Luffy' }).expect(200);
      await request(app.getHttpServer()).get('/v1/cards').query({ name: 'luffy' }).expect(200);

      expect(findAndCount).toHaveBeenCalledTimes(1);

    });


    it('después de invalidate vuelve a consultar el repositorio', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01' }).expect(200);

      await cache.invalidate();

      await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01' }).expect(200);

      expect(findAndCount).toHaveBeenCalledTimes(2);

    });


    it('una respuesta 400 no se guarda en la caché', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ code: 'A'.repeat(21) }).expect(400);
      await request(app.getHttpServer()).get('/v1/cards').query({ code: 'A'.repeat(21) }).expect(400);

      expect(findAndCount).not.toHaveBeenCalled();

    });

  });

});
