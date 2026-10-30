import RedisMock from 'ioredis-mock';
import { Redis } from 'ioredis';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CardsListCache } from './cards-list.cache';
import { ListCardsDto } from '../dto/list-cards.dto';
import { PaginatedCardsDto } from '../dto/paginated-cards.dto';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

describe('CardsListCache', () => {

  let redis: Redis;
  let cache: CardsListCache;

  const config = { get: jest.fn().mockReturnValue(3600) } as unknown as ConfigService;
  const query  = { page: 1, limit: 20 } as ListCardsDto;
  const result = { items: [], total: 0, page: 1, totalPages: 0 } as PaginatedCardsDto;

  beforeEach(async () => {
    redis = new RedisMock() as unknown as Redis;
    await redis.flushall();

    cache = new CardsListCache(redis, config);
  });



  afterEach(() => {
    jest.restoreAllMocks();

  });



  it('devuelve null en miss y el listado guardado después de set', async () => {
    expect(await cache.get(query)).toBeNull();

    await cache.set(query, result);

    expect(await cache.get(query)).toEqual(result);

  });



  it('guarda la key con TTL', async () => {
    await cache.set(query, result);

    const [key] = await redis.keys('cards:list:v0:*');
    const ttl   = await redis.ttl(key);

    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(3600);

  });



  it('comparte key entre name en mayúsculas y minúsculas', async () => {
    await cache.set({ ...query, name: 'Luffy' }, result);

    expect(await cache.get({ ...query, name: 'luffy' })).toEqual(result);

  });



  it('no comparte key entre queries distintos', async () => {
    await cache.set({ ...query, page: 1 }, result);

    expect(await cache.get({ ...query, page: 2 })).toBeNull();

  });



  it.each([
    { a: { cost: 3 },               b: { cost: 5 }               },
    { a: { cost: 3 },               b: {}                        },
    { a: { cost: 0 },               b: {}                        },
    { a: { costMin: 2 },            b: { costMin: 3 }            },
    { a: { costMax: 2 },            b: { costMax: 3 }            },
    { a: { costMin: 2 },            b: { costMax: 2 }            },
    { a: { costMin: 2, costMax: 5 }, b: { costMin: 2, costMax: 6 } },
  ])('no comparte key entre $a y $b', async ({ a, b }) => {
    await cache.set({ ...query, ...a }, result);

    expect(await cache.get({ ...query, ...b })).toBeNull();

  });



  it('comparte key entre q en mayúsculas y minúsculas', async () => {
    await cache.set({ ...query, q: 'Luffy' }, result);

    expect(await cache.get({ ...query, q: 'luffy' })).toEqual(result);

  });



  it.each([
    { a: { q: 'luffy' }, b: { q: 'zoro' } },
    { a: { q: 'luffy' }, b: {}            },
    { a: { q: 'luffy' }, b: { name: 'luffy' } },
  ])('no comparte key entre $a y $b', async ({ a, b }) => {
    await cache.set({ ...query, ...a }, result);

    expect(await cache.get({ ...query, ...b })).toBeNull();

  });



  it('comparte key entre trait en mayúsculas y minúsculas', async () => {
    await cache.set({ ...query, trait: 'Straw Hat Crew' }, result);

    expect(await cache.get({ ...query, trait: 'straw hat crew' })).toEqual(result);

  });



  it.each([
    { a: { trait: 'straw' }, b: { trait: 'supernovas' } },
    { a: { trait: 'straw' }, b: {}                      },
  ])('no comparte key entre $a y $b', async ({ a, b }) => {
    await cache.set({ ...query, ...a }, result);

    expect(await cache.get({ ...query, ...b })).toBeNull();

  });



  it('comparte key entre queries con el mismo coste', async () => {
    await cache.set({ ...query, costMin: 2, costMax: 5 }, result);

    expect(await cache.get({ ...query, costMin: 2, costMax: 5 })).toEqual(result);

  });



  it('invalidate hace que lo guardado antes ya no se encuentre', async () => {
    await cache.set(query, result);
    await cache.invalidate();

    expect(await redis.get('cards:list:version')).toBe('1');
    expect(await cache.get(query)).toBeNull();

  });



  it('trata un valor corrupto como miss', async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await cache.set(query, result);

    const [key] = await redis.keys('cards:list:v0:*');
    await redis.set(key, 'no-es-json');

    expect(await cache.get(query)).toBeNull();

  });



  describe('con Redis roto', () => {

    let broken: CardsListCache;

    beforeEach(() => {
      const fail = jest.fn().mockRejectedValue(new Error('Connection is closed.'));

      broken = new CardsListCache({ get: fail, set: fail, incr: fail } as unknown as Redis, config);

      jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });



    it('get devuelve null', async () => {
      expect(await broken.get(query)).toBeNull();

    });



    it('set no lanza', async () => {
      await expect(broken.set(query, result)).resolves.toBeUndefined();

    });



    it('invalidate no lanza', async () => {
      await expect(broken.invalidate()).resolves.toBeUndefined();

    });

  });

});
