import { Like, Repository } from 'typeorm';
import { CardsReadRepository } from './cards-read.repository';
import { CardEntity } from '../entities/card.entity';

// @nestjs/typeorm 12 es ESM puro y jest (CommonJS) no lo carga; solo se necesita el decorador
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

describe('CardsReadRepository', () => {

  let repository: CardsReadRepository;
  let findAndCount: jest.Mock;

  beforeEach(() => {
    findAndCount = jest.fn().mockResolvedValue([[], 0]);

    repository = new CardsReadRepository({ findAndCount } as unknown as Repository<CardEntity>);

  });


  describe('findPage', () => {

    it('sin filtros usa where vacío', async () => {
      await repository.findPage(0, 20, {});

      expect(findAndCount).toHaveBeenCalledWith({ where: {}, order: { cardCode: 'ASC', id: 'ASC' }, skip: 0, take: 20 });

    });


    it('filtra code por prefijo', async () => {
      await repository.findPage(0, 20, { code: 'OP01' });

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cardCode: Like('OP01%') } }));

    });


    it('filtra name por contenido', async () => {
      await repository.findPage(0, 20, { name: 'izo' });

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { name: Like('%izo%') } }));

    });


    it('combina name y code con la paginación', async () => {
      await repository.findPage(10, 5, { name: 'izo', code: 'OP01-001' });

      expect(findAndCount).toHaveBeenCalledWith({ where: { name: Like('%izo%'), cardCode: Like('OP01-001%') }, order: { cardCode: 'ASC', id: 'ASC' }, skip: 10, take: 5 });

    });


    it('escapa los comodines de code', async () => {
      await repository.findPage(0, 20, { code: 'OP_01%' });

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cardCode: Like('OP\\_01\\%%') } }));

    });


    it('devuelve items y total', async () => {
      const items = [{ externalId: 'OP01-001' }] as CardEntity[];
      findAndCount.mockResolvedValue([items, 1]);

      await expect(repository.findPage(0, 20, {})).resolves.toEqual({ items, total: 1 });

    });

  });

});
