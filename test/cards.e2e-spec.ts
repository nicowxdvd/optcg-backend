import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import RedisMock from 'ioredis-mock';
import request from 'supertest';
import { Repository } from 'typeorm';
import { CardsListCache } from '../src/cards/cache/cards-list.cache';
import { CardsController } from '../src/cards/cards.controller';
import { CardsService } from '../src/cards/cards.service';
import { CardEntity } from '../src/cards/entities/card.entity';
import { CardType } from '../src/cards/enums/card-type.enum';
import { CARDS_READ_REPOSITORY } from '../src/cards/ports/cards-read.repository.port';
import { CardsReadRepository } from '../src/cards/repositories/cards-read.repository';
import { REDIS_CLIENT } from '../src/redis/redis.constants';
import { traitExists } from '../src/utils/utils';

const makeCard = (externalId: string, cardCode: string) => ({ externalId, cardCode, name: 'Luffy', type: CardType.CHARACTER, rarity: 'R', color: 'Red', cost: 5, power: 7000, counterValue: null, attribute: 'Ranged', effect: null, triggerEffect: null, imageUrl: 'https://img/luffy.png' }) as CardEntity;

const traitClause = traitExists('card', 'card_trait', 'card_id', 'trait');

// @nestjs/typeorm 12 es ESM puro y jest (CommonJS) no lo carga; solo se necesita el decorador
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

// @nestjs/config también es ESM puro; CardsListCache solo lo usa como token de inyección
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

describe('GET /v1/cards (e2e)', () => {

  let app: INestApplication;
  let qb: Record<string, jest.Mock>;
  let getManyAndCount: jest.Mock;
  let cache: CardsListCache;

  beforeEach(async () => {
    qb = {};

    for (const method of ['orderBy', 'addOrderBy', 'skip', 'take', 'andWhere'])
      qb[method] = jest.fn().mockReturnValue(qb);

    getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
    qb.getManyAndCount = getManyAndCount;

    const redis = new RedisMock();
    await redis.flushall();

    const moduleRef = await Test.createTestingModule({
      controllers: [CardsController],
      providers: [
        CardsService,
        CardsListCache,
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(3600) } },
        { provide: CARDS_READ_REPOSITORY, useFactory: () => new CardsReadRepository({ createQueryBuilder: jest.fn().mockReturnValue(qb) } as unknown as Repository<CardEntity>) },
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


  it('sin filtros devuelve la primera página sin condiciones', async () => {
    await request(app.getHttpServer()).get('/v1/cards').expect(200);

    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('card.cardCode', 'ASC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('card.id', 'ASC');
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(20);

  });


  it('code exacto devuelve la carta y sus variantes', async () => {
    const items = [makeCard('OP01-001', 'OP01-001'), makeCard('OP01-001_p1', 'OP01-001')];
    getManyAndCount.mockResolvedValue([items, 2]);

    const response = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01-001' }).expect(200);

    expect(qb.andWhere).toHaveBeenCalledWith('card.cardCode LIKE :code', { code: 'OP01-001%' });
    expect(response.body.total).toBe(2);
    expect(response.body.items.map((item: { externalId: string }) => item.externalId)).toEqual(['OP01-001', 'OP01-001_p1']);

  });


  it('code en minúsculas se normaliza a mayúsculas', async () => {
    await request(app.getHttpServer()).get('/v1/cards').query({ code: 'op01-001' }).expect(200);

    expect(qb.andWhere).toHaveBeenCalledWith('card.cardCode LIKE :code', { code: 'OP01-001%' });

  });


  it('prefijo de set devuelve todo el set', async () => {
    const items = [makeCard('OP01-001', 'OP01-001'), makeCard('OP01-002', 'OP01-002'), makeCard('OP01-003', 'OP01-003')];
    getManyAndCount.mockResolvedValue([items, 3]);

    const response = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01' }).expect(200);

    expect(qb.andWhere).toHaveBeenCalledWith('card.cardCode LIKE :code', { code: 'OP01%' });
    expect(response.body.items).toHaveLength(3);

  });


  it('combina code con name y paginación', async () => {
    getManyAndCount.mockResolvedValue([[], 12]);

    const response = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01', name: 'luffy', page: 2, limit: 5 }).expect(200);

    expect(qb.andWhere).toHaveBeenCalledTimes(2);
    expect(qb.andWhere).toHaveBeenCalledWith('card.name LIKE :name', { name: '%luffy%' });
    expect(qb.andWhere).toHaveBeenCalledWith('card.cardCode LIKE :code', { code: 'OP01%' });
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(response.body).toMatchObject({ total: 12, page: 2, totalPages: 3 });

  });


  it('code vacío no filtra', async () => {
    await request(app.getHttpServer()).get('/v1/cards').query({ code: '' }).expect(200);

    expect(qb.andWhere).not.toHaveBeenCalled();

  });


  it('code de más de 20 caracteres devuelve 400', async () => {
    const response = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'A'.repeat(21) }).expect(400);

    expect(response.body.message).toContain('code debe tener como máximo 20 caracteres');
    expect(getManyAndCount).not.toHaveBeenCalled();

  });


  describe('filtro por trait', () => {

    it('trait filtra por contenido con la subconsulta de traits', async () => {
      getManyAndCount.mockResolvedValue([[makeCard('OP01-001', 'OP01-001')], 1]);

      const response = await request(app.getHttpServer()).get('/v1/cards').query({ trait: 'Straw Hat' }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%Straw Hat%' });
      expect(response.body.total).toBe(1);

    });


    it('trait se recorta y conserva las mayúsculas', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ trait: '  Supernovas  ' }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%Supernovas%' });

    });


    it('trait vacío no filtra', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ trait: '' }).expect(200);

      expect(qb.andWhere).not.toHaveBeenCalled();

    });


    it('combina trait con cost, name y paginación', async () => {
      getManyAndCount.mockResolvedValue([[], 7]);

      const response = await request(app.getHttpServer()).get('/v1/cards').query({ trait: 'straw', costMax: 3, name: 'lu', page: 2, limit: 5 }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledTimes(3);
      expect(qb.andWhere).toHaveBeenCalledWith('card.name LIKE :name', { name: '%lu%' });
      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%straw%' });
      expect(qb.andWhere).toHaveBeenCalledWith('card.cost <= :costMax', { costMax: 3 });
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(response.body).toMatchObject({ total: 7, page: 2, totalPages: 2 });

    });


    it('trait de más de 50 caracteres devuelve 400', async () => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ trait: 'A'.repeat(51) }).expect(400);

      expect(response.body.message).toContain('trait debe tener como máximo 50 caracteres');
      expect(getManyAndCount).not.toHaveBeenCalled();

    });

  });


  describe('filtro por coste', () => {

    it('cost filtra por valor exacto', async () => {
      getManyAndCount.mockResolvedValue([[makeCard('OP01-001', 'OP01-001')], 1]);

      const response = await request(app.getHttpServer()).get('/v1/cards').query({ cost: 3 }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('card.cost = :cost', { cost: 3 });
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(response.body.total).toBe(1);

    });


    it('cost=0 filtra por coste 0', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ cost: 0 }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledWith('card.cost = :cost', { cost: 0 });

    });


    it('costMin y costMax filtran por rango', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 2, costMax: 5 }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledWith('card.cost BETWEEN :costMin AND :costMax', { costMin: 2, costMax: 5 });

    });


    it('costMin igual a costMax se acepta', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 3, costMax: 3 }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledWith('card.cost BETWEEN :costMin AND :costMax', { costMin: 3, costMax: 3 });

    });


    it('solo costMin filtra desde ese valor', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 4 }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledWith('card.cost >= :costMin', { costMin: 4 });

    });


    it('solo costMax filtra hasta ese valor', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ costMax: 4 }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledWith('card.cost <= :costMax', { costMax: 4 });

    });


    it('cost vacío no filtra', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ cost: '', costMin: '', costMax: '' }).expect(200);

      expect(qb.andWhere).not.toHaveBeenCalled();

    });


    it('combina el rango de coste con name, code y paginación', async () => {
      getManyAndCount.mockResolvedValue([[], 12]);

      const response = await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 2, costMax: 5, name: 'luffy', code: 'OP01', page: 2, limit: 5 }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledTimes(3);
      expect(qb.andWhere).toHaveBeenCalledWith('card.name LIKE :name', { name: '%luffy%' });
      expect(qb.andWhere).toHaveBeenCalledWith('card.cardCode LIKE :code', { code: 'OP01%' });
      expect(qb.andWhere).toHaveBeenCalledWith('card.cost BETWEEN :costMin AND :costMax', { costMin: 2, costMax: 5 });
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(response.body).toMatchObject({ total: 12, page: 2, totalPages: 3 });

    });


    it('combina cost exacto con name y paginación', async () => {
      getManyAndCount.mockResolvedValue([[], 7]);

      const response = await request(app.getHttpServer()).get('/v1/cards').query({ cost: 4, name: 'lu', page: 2, limit: 5 }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledTimes(2);
      expect(qb.andWhere).toHaveBeenCalledWith('card.name LIKE :name', { name: '%lu%' });
      expect(qb.andWhere).toHaveBeenCalledWith('card.cost = :cost', { cost: 4 });
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(response.body).toMatchObject({ total: 7, page: 2, totalPages: 2 });

    });


    it.each(['abc', '1.5', '3abc', 'NaN'])('cost=%s devuelve 400', async (value) => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ cost: value }).expect(400);

      expect(response.body.message).toContain('cost debe ser un número entero');
      expect(getManyAndCount).not.toHaveBeenCalled();

    });


    it('costMin no numérico devuelve 400', async () => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 'abc' }).expect(400);

      expect(response.body.message).toContain('costMin debe ser un número entero');
      expect(getManyAndCount).not.toHaveBeenCalled();

    });


    it('costMax no numérico devuelve 400', async () => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ costMax: 'abc' }).expect(400);

      expect(response.body.message).toContain('costMax debe ser un número entero');
      expect(getManyAndCount).not.toHaveBeenCalled();

    });


    it('cost negativo devuelve 400', async () => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ cost: -1 }).expect(400);

      expect(response.body.message).toContain('cost debe ser mayor o igual a 0');
      expect(getManyAndCount).not.toHaveBeenCalled();

    });


    it('costMin mayor que costMax devuelve 400', async () => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 5, costMax: 2 }).expect(400);

      expect(response.body.message).toContain('costMax debe ser mayor o igual a costMin');
      expect(getManyAndCount).not.toHaveBeenCalled();

    });


    it.each([{ costMin: 1 }, { costMax: 5 }, { costMin: 1, costMax: 5 }])('cost junto con %p devuelve 400', async (range) => {
      const response = await request(app.getHttpServer()).get('/v1/cards').query({ cost: 3, ...range }).expect(400);

      expect(response.body.message).toContain('cost no se puede combinar con costMin ni costMax');
      expect(getManyAndCount).not.toHaveBeenCalled();

    });

  });


  describe('caché', () => {

    it('dos GET iguales consultan el repositorio una sola vez', async () => {
      getManyAndCount.mockResolvedValue([[makeCard('OP01-001', 'OP01-001')], 1]);

      const first  = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01-001' }).expect(200);
      const second = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01-001' }).expect(200);

      expect(getManyAndCount).toHaveBeenCalledTimes(1);
      expect(second.body).toEqual(first.body);

    });


    it('GET con filtros distintos no comparten caché', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01' }).expect(200);
      await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP02' }).expect(200);

      expect(getManyAndCount).toHaveBeenCalledTimes(2);

    });


    it('cost distinto no comparte caché', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ cost: 3 }).expect(200);
      await request(app.getHttpServer()).get('/v1/cards').query({ cost: 5 }).expect(200);

      expect(getManyAndCount).toHaveBeenCalledTimes(2);

    });


    it('rangos de coste distintos no comparten caché', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 2, costMax: 5 }).expect(200);
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 2, costMax: 6 }).expect(200);

      expect(getManyAndCount).toHaveBeenCalledTimes(2);

    });


    it('dos GET con el mismo coste consultan el repositorio una sola vez', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 2, costMax: 5 }).expect(200);
      await request(app.getHttpServer()).get('/v1/cards').query({ costMin: 2, costMax: 5 }).expect(200);

      expect(getManyAndCount).toHaveBeenCalledTimes(1);

    });


    it('trait distinto no comparte caché', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ trait: 'straw' }).expect(200);
      await request(app.getHttpServer()).get('/v1/cards').query({ trait: 'supernovas' }).expect(200);

      expect(getManyAndCount).toHaveBeenCalledTimes(2);

    });


    it('trait en mayúsculas y minúsculas comparte caché', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ trait: 'Straw' }).expect(200);
      await request(app.getHttpServer()).get('/v1/cards').query({ trait: 'straw' }).expect(200);

      expect(getManyAndCount).toHaveBeenCalledTimes(1);

    });


    it('name en mayúsculas y minúsculas comparte caché', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ name: 'Luffy' }).expect(200);
      await request(app.getHttpServer()).get('/v1/cards').query({ name: 'luffy' }).expect(200);

      expect(getManyAndCount).toHaveBeenCalledTimes(1);

    });


    it('después de invalidate vuelve a consultar el repositorio', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01' }).expect(200);

      await cache.invalidate();

      await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01' }).expect(200);

      expect(getManyAndCount).toHaveBeenCalledTimes(2);

    });


    it('una respuesta 400 no se guarda en la caché', async () => {
      await request(app.getHttpServer()).get('/v1/cards').query({ code: 'A'.repeat(21) }).expect(400);
      await request(app.getHttpServer()).get('/v1/cards').query({ code: 'A'.repeat(21) }).expect(400);

      expect(getManyAndCount).not.toHaveBeenCalled();

    });

  });

});
