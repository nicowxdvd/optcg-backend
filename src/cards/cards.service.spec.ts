import { Test } from '@nestjs/testing';
import { CardsService } from './cards.service';
import { CARDS_READ_REPOSITORY, type CardsReadRepositoryPort } from './ports/cards-read.repository.port';
import { CardEntity } from './entities/card.entity';
import { CardType } from './enums/card-type.enum';

const makeCard = (externalId: string) => ({ externalId, cardCode: externalId, name: 'Izo', type: CardType.CHARACTER, rarity: 'R', color: 'Red', cost: 5, power: 7000, counterValue: null, attribute: 'Ranged', effect: null, triggerEffect: null, imageUrl: 'https://img/izo.png' }) as CardEntity;

describe('CardsService', () => {

  let service : CardsService;
  let findPage: jest.MockedFunction<CardsReadRepositoryPort['findPage']>;

  beforeEach(async () => {
    findPage = jest.fn();

    const module = await Test.createTestingModule({
      providers: [CardsService, { provide: CARDS_READ_REPOSITORY, useValue: { findPage } }],
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

      expect(findPage).toHaveBeenCalledWith(skip, limit);
      expect(result).toEqual({ items: [], total, page, totalPages });

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

  });

});
