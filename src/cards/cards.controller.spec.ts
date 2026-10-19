import { Test } from '@nestjs/testing';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { PaginatedCardsDto } from './dto/paginated-cards.dto';

describe('CardsController', () => {

  let controller: CardsController;
  let list      : jest.MockedFunction<CardsService['list']>;

  beforeEach(async () => {
    list = jest.fn();

    const module = await Test.createTestingModule({
      controllers: [CardsController],
      providers  : [{ provide: CardsService, useValue: { list } }],
    }).compile();

    controller = module.get(CardsController);

  });


  describe('list', () => {

    it('delega en CardsService con la query recibida y devuelve su resultado', async () => {
      const page: PaginatedCardsDto = { items: [], total: 0, page: 2, totalPages: 0 };
      list.mockResolvedValue(page);

      const result = await controller.list({ page: 2, limit: 5 });

      expect(list).toHaveBeenCalledWith({ page: 2, limit: 5 });
      expect(result).toBe(page);

    });


    it('propaga el error del service', async () => {
      list.mockRejectedValue(new Error('falló'));

      await expect(controller.list({ page: 1, limit: 20 })).rejects.toThrow('falló');

    });

  });

});
