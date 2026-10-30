import { Test } from '@nestjs/testing';
import { CardsService } from './cards.service';
import { CARDS_READ_REPOSITORY, type CardsReadRepositoryPort } from './ports/cards-read.repository.port';
import { CardEntity } from './entities/card.entity';
import { CardType } from './enums/card-type.enum';
import { CardsListCache } from './cache/cards-list.cache';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

const makeCard = (externalId: string) => ({ externalId, cardCode: externalId, name: 'Izo', type: CardType.CHARACTER, rarity: 'R', color: 'Red', cost: 5, power: 7000, counterValue: null, attribute: 'Ranged', effect: null, triggerEffect: null, imageUrl: 'https://img/izo.png' }) as CardEntity;

describe('CardsService', () => {

  let service : CardsService;
  let findPage: jest.MockedFunction<CardsReadRepositoryPort['findPage']>;
  let cache   : { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    findPage = jest.fn();
    cache    = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [CardsService, { provide: CARDS_READ_REPOSITORY, useValue: { findPage } }, { provide: CardsListCache, useValue: cache }],
    }).compile();

    service = module.get(CardsService);

  });


  describe('list', () => {

    it.each([
      { page: 1, limit: 20, total: 100, skip: 0,  totalPages: 5  },
      { page: 3, limit: 10, total: 100, skip: 20, totalPages: 10 },
      { page: 2, limit: 5,  total: 6,   skip: 5,  totalPages: 2  },
      { page: 1, limit: 20, total: 21,  skip: 0,  totalPages: 2  },
      { page: 1, limit: 20, total: 0,   skip: 0,  totalPages: 0  },
    ])('page=$page limit=$limit total=$total pide skip=$skip y devuelve totalPages=$totalPages', async ({ page, limit, total, skip, totalPages }) => {
      findPage.mockResolvedValue({ items: [], total });

      const result = await service.list({ page, limit });

      expect(findPage).toHaveBeenCalledWith(skip, limit, { name: undefined, code: undefined });
      expect(result).toEqual({ items: [], total, page, totalPages });

    });


    it('pasa name al repositorio', async () => {
      findPage.mockResolvedValue({ items: [], total: 0 });

      await service.list({ page: 2, limit: 10, name: 'izo' });

      expect(findPage).toHaveBeenCalledWith(10, 10, { name: 'izo', code: undefined });

    });


    it('pasa code al repositorio', async () => {
      findPage.mockResolvedValue({ items: [], total: 0 });

      await service.list({ page: 1, limit: 20, code: 'OP01' });

      expect(findPage).toHaveBeenCalledWith(0, 20, { name: undefined, code: 'OP01' });

    });


    it('pasa trait al repositorio', async () => {
      findPage.mockResolvedValue({ items: [], total: 0 });

      await service.list({ page: 1, limit: 20, trait: 'straw' });

      expect(findPage).toHaveBeenCalledWith(0, 20, expect.objectContaining({ trait: 'straw' }));

    });


    it('combina trait con cost, name y la paginación', async () => {
      findPage.mockResolvedValue({ items: [], total: 12 });

      const result = await service.list({ page: 3, limit: 5, name: 'izo', cost: 4, trait: 'straw' });

      expect(findPage).toHaveBeenCalledWith(10, 5, expect.objectContaining({ name: 'izo', cost: 4, trait: 'straw' }));
      expect(result).toEqual({ items: [], total: 12, page: 3, totalPages: 3 });

    });


    it('combina name y code con la paginación', async () => {
      findPage.mockResolvedValue({ items: [], total: 25 });

      const result = await service.list({ page: 2, limit: 10, name: 'izo', code: 'OP01' });

      expect(findPage).toHaveBeenCalledWith(10, 10, { name: 'izo', code: 'OP01' });
      expect(result).toEqual({ items: [], total: 25, page: 2, totalPages: 3 });

    });


    it('pasa cost al repositorio', async () => {
      findPage.mockResolvedValue({ items: [], total: 0 });

      await service.list({ page: 1, limit: 20, cost: 3 });

      expect(findPage).toHaveBeenCalledWith(0, 20, { name: undefined, code: undefined, cost: 3, costMin: undefined, costMax: undefined });

    });


    it('pasa cost 0 al repositorio', async () => {
      findPage.mockResolvedValue({ items: [], total: 0 });

      await service.list({ page: 1, limit: 20, cost: 0 });

      expect(findPage).toHaveBeenCalledWith(0, 20, expect.objectContaining({ cost: 0 }));

    });


    it('pasa costMin y costMax al repositorio', async () => {
      findPage.mockResolvedValue({ items: [], total: 0 });

      await service.list({ page: 1, limit: 20, costMin: 2, costMax: 5 });

      expect(findPage).toHaveBeenCalledWith(0, 20, { name: undefined, code: undefined, cost: undefined, costMin: 2, costMax: 5 });

    });


    it('combina el rango de cost con name, code y la paginación', async () => {
      findPage.mockResolvedValue({ items: [], total: 25 });

      const result = await service.list({ page: 2, limit: 10, name: 'izo', code: 'OP01', costMin: 2, costMax: 5 });

      expect(findPage).toHaveBeenCalledWith(10, 10, { name: 'izo', code: 'OP01', cost: undefined, costMin: 2, costMax: 5 });
      expect(result).toEqual({ items: [], total: 25, page: 2, totalPages: 3 });

    });


    it('combina cost exacto con name y la paginación', async () => {
      findPage.mockResolvedValue({ items: [], total: 12 });

      const result = await service.list({ page: 3, limit: 5, name: 'izo', cost: 4 });

      expect(findPage).toHaveBeenCalledWith(10, 5, expect.objectContaining({ name: 'izo', cost: 4 }));
      expect(result).toEqual({ items: [], total: 12, page: 3, totalPages: 3 });

    });


    it('mapea cada entity a CardResponseDto', async () => {
      findPage.mockResolvedValue({ items: [makeCard('OP01-001'), makeCard('OP01-002')], total: 2 });

      const result = await service.list({ page: 1, limit: 20 });

      expect(result.items.map(item => item.externalId)).toEqual(['OP01-001', 'OP01-002']);
      expect(result.items[0]).toEqual({ externalId: 'OP01-001', cardCode: 'OP01-001', name: 'Izo', type: CardType.CHARACTER, rarity: 'R', color: 'Red', cost: 5, power: 7000, counterValue: null, attribute: 'Ranged', effect: null, triggerEffect: null, imageUrl: 'https://img/izo.png' });

    });


    it('propaga el error del repositorio', async () => {
      findPage.mockRejectedValue(new Error('db caída'));

      await expect(service.list({ page: 1, limit: 20 })).rejects.toThrow('db caída');

    });


    it('hit: devuelve la caché y no llama al repositorio', async () => {
      const cached = { items: [], total: 3, page: 1, totalPages: 1 };
      cache.get.mockResolvedValue(cached);

      const result = await service.list({ page: 1, limit: 20 });

      expect(result).toBe(cached);
      expect(findPage).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();

    });


    it('miss: consulta el repositorio y guarda el resultado en la caché', async () => {
      findPage.mockResolvedValue({ items: [], total: 0 });
      const query = { page: 1, limit: 20 };

      const result = await service.list(query);

      expect(findPage).toHaveBeenCalledTimes(1);
      expect(cache.set).toHaveBeenCalledWith(query, result);

    });


    it('no guarda en la caché si el repositorio falla', async () => {
      findPage.mockRejectedValue(new Error('db caída'));

      await expect(service.list({ page: 1, limit: 20 })).rejects.toThrow('db caída');

      expect(cache.set).not.toHaveBeenCalled();

    });

  });

});
