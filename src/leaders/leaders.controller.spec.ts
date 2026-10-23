import { Test } from '@nestjs/testing';
import { LeadersController } from './leaders.controller';
import { LeadersService } from './leaders.service';
import { ListLeadersDto } from './dto/list-leaders.dto';
import { PaginatedLeadersDto } from './dto/paginated-leaders.dto';

describe('LeadersController', () => {

  let controller : LeadersController;
  let list       : jest.MockedFunction<LeadersService['list']>;

  beforeEach(async () => {
    list = jest.fn();

    const module = await Test.createTestingModule({
      controllers: [LeadersController],
      providers: [{ provide: LeadersService, useValue: { list } }],
    }).compile();

    controller = module.get(LeadersController);

  });


  describe('list', () => {

    it('pasa el query al service tal cual', async () => {
      const query: ListLeadersDto = { page: 2, limit: 10, name: 'luffy', code: 'OP01', color: 'RED' };
      list.mockResolvedValue({ items: [], total: 0, page: 2, totalPages: 0 });

      await controller.list(query);

      expect(list).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledWith(query);

    });

    it('devuelve el resultado del service sin transformarlo', async () => {
      const response: PaginatedLeadersDto = { items: [], total: 25, page: 2, totalPages: 3 };
      list.mockResolvedValue(response);

      const result = await controller.list({ page: 2, limit: 10 });

      expect(result).toBe(response);

    });

    it('propaga el error del service', async () => {
      list.mockRejectedValue(new Error('db caída'));

      await expect(controller.list({ page: 1, limit: 20 })).rejects.toThrow('db caída');

    });

  });

});
