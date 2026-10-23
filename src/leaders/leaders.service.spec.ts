import { Test } from '@nestjs/testing';
import { LeadersService } from './leaders.service';
import { LEADERS_READ_REPOSITORY, type LeadersReadRepositoryPort } from './ports/leaders-read.repository.port';

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

  });

});