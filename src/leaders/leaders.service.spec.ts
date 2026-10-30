import { Test } from '@nestjs/testing';
import { LeadersService } from './leaders.service';
import { LEADERS_READ_REPOSITORY, type LeadersReadRepositoryPort } from './ports/leaders-read.repository.port';
import { LeaderEntity } from '../cards/entities/leader.entity';
import { toResponse } from './mappers/leader.mapper';
describe('LeadersService', () => {

  let service : LeadersService;
  let findPage: jest.MockedFunction<LeadersReadRepositoryPort['findPage']>;

  beforeEach(async () => {
    findPage = jest.fn();

    const module = await Test.createTestingModule({
      providers: [LeadersService, { provide: LEADERS_READ_REPOSITORY, useValue: { findPage } }],
    }).compile();

    service = module.get(LeadersService);

  });


  describe('list', () => {

    it('pasa skip y filtros al repositorio y devuelve totalPages', async () => {
      findPage.mockResolvedValue({ items: [], total: 25 });

      const result = await service.list({ page: 2, limit: 10, name: 'luffy', code: 'OP01', color: 'Red' });

      expect(findPage).toHaveBeenCalledWith(10, 10, { name: 'luffy', code: 'OP01', color: 'Red' });
      expect(result).toEqual({ items: [], total: 25, page: 2, totalPages: 3 });

    });

    it('pasa trait al repositorio', async () => {
      findPage.mockResolvedValue({ items: [], total: 0 });

      await service.list({ page: 1, limit: 20, trait: 'straw' });

      expect(findPage).toHaveBeenCalledWith(0, 20, expect.objectContaining({ trait: 'straw' }));

    });


    it('combina trait con color, name y la paginación', async () => {
      findPage.mockResolvedValue({ items: [], total: 12 });

      const result = await service.list({ page: 3, limit: 5, name: 'luffy', color: 'Red', trait: 'straw' });

      expect(findPage).toHaveBeenCalledWith(10, 5, expect.objectContaining({ name: 'luffy', color: 'Red', trait: 'straw' }));
      expect(result).toEqual({ items: [], total: 12, page: 3, totalPages: 3 });

    });


    it.each([
      { page: 1, limit: 20, total: 100, skip: 0,  totalPages: 5  },
      { page: 3, limit: 10, total: 100, skip: 20, totalPages: 10 },
      { page: 2, limit: 5,  total: 6,   skip: 5,  totalPages: 2  },
      { page: 1, limit: 20, total: 21,  skip: 0,  totalPages: 2  },
      { page: 1, limit: 20, total: 0,   skip: 0,  totalPages: 0  },
    ])('page=$page limit=$limit total=$total pide skip=$skip y devuelve totalPages=$totalPages', async ({ page, limit, total, skip, totalPages }) => {
      findPage.mockResolvedValue({ items: [], total });

      const result = await service.list({ page, limit });

      expect(findPage).toHaveBeenCalledWith(skip, limit, { name: undefined, code: undefined, color: undefined });
      expect(result).toEqual({ items: [], total, page, totalPages });

    });

    it('devuelve items vacíos y totalPages real si page supera el total', async () => {
      findPage.mockResolvedValue({ items: [], total: 100 });

      const result = await service.list({ page: 99, limit: 20 });

      expect(findPage).toHaveBeenCalledWith(1960, 20, { name: undefined, code: undefined, color: undefined });
      expect(result).toEqual({ items: [], total: 100, page: 99, totalPages: 5 });

    });

    it('mapea cada item del repositorio con toResponse', async () => {
      const zoro  = { id: 1, externalId: 'OP01-001_p1', cardCode: 'OP01-001', name: 'Roronoa Zoro', rarity: 'L', color: 'Red', life: 5, power: 5000, attribute: 'Slash', effect: null, imageUrl: 'https://img/OP01-001.png', set: { id: 1, name: 'Romance Dawn' }, traits: [{ id: 2, name: 'Straw Hat Crew' }, { id: 1, name: 'Supernovas' }] } as unknown as LeaderEntity;
      const law   = { id: 2, externalId: 'OP01-002_p1', cardCode: 'OP01-002', name: 'Trafalgar Law', rarity: 'L', color: 'Green', life: 4, power: 5000, attribute: 'Slash', effect: null, imageUrl: 'https://img/OP01-002.png', set: { id: 1, name: 'Romance Dawn' }, traits: [{ id: 3, name: 'Supernovas' }] } as unknown as LeaderEntity;

      findPage.mockResolvedValue({ items: [zoro, law], total: 2 });

      const result = await service.list({ page: 1, limit: 20 });

      expect(result.items).toEqual([toResponse(zoro), toResponse(law)]);
      expect(result.items[0]).toMatchObject({ set: 'Romance Dawn', traits: ['Straw Hat Crew', 'Supernovas'] });
      expect(result.items[0]).not.toHaveProperty('id');

    });

    it('propaga el error del repositorio', async () => {
      findPage.mockRejectedValue(new Error('db caída'));

      await expect(service.list({ page: 1, limit: 20 })).rejects.toThrow('db caída');

    });

  });

});