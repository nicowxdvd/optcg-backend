import { Like, Repository } from 'typeorm';
import { LeadersReadRepository } from './leaders-read.repository';
import { LeaderEntity } from '../../cards/entities/leader.entity';

// @nestjs/typeorm 12 es ESM puro y jest (CommonJS) no lo carga; solo se necesita el decorador
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

describe('LeadersReadRepository', () => {

  let repository: LeadersReadRepository;
  let findAndCount: jest.Mock;

  beforeEach(() => {
    findAndCount = jest.fn().mockResolvedValue([[], 0]);

    repository = new LeadersReadRepository({ findAndCount } as unknown as Repository<LeaderEntity>);

  });


  describe('findPage', () => {

    it('sin filtros usa where vacío, relations y orden', async () => {
      await repository.findPage(0, 20, {});

      expect(findAndCount).toHaveBeenCalledWith({ where: {}, relations: { set: true, traits: true }, order: { cardCode: 'ASC', id: 'ASC' }, skip: 0, take: 20 });

    });


    it('filtra code por prefijo', async () => {
      await repository.findPage(0, 20, { code: 'OP01' });

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cardCode: Like('OP01%') } }));

    });


    it('filtra name por contenido', async () => {
      await repository.findPage(0, 20, { name: 'luffy' });

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { name: Like('%luffy%') } }));

    });


    it('filtra color por contenido', async () => {
      await repository.findPage(0, 20, { color: 'RED' });

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { color: Like('%RED%') } }));

    });


    it('combina name, code y color con la paginación', async () => {
      await repository.findPage(10, 5, { name: 'luffy', code: 'OP01-001', color: 'RED' });

      expect(findAndCount).toHaveBeenCalledWith({ where: { name: Like('%luffy%'), cardCode: Like('OP01-001%'), color: Like('%RED%') }, relations: { set: true, traits: true }, order: { cardCode: 'ASC', id: 'ASC' }, skip: 10, take: 5 });

    });


    it('escapa los comodines de name, code y color', async () => {
      await repository.findPage(0, 20, { name: 'a_b', code: 'OP_01%', color: 'R%D' });

      expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { name: Like('%a\\_b%'), cardCode: Like('OP\\_01\\%%'), color: Like('%R\\%D%') } }));

    });


    it('devuelve items y total', async () => {
      const items = [{ externalId: 'OP01-001' }] as LeaderEntity[];
      findAndCount.mockResolvedValue([items, 1]);

      await expect(repository.findPage(0, 20, {})).resolves.toEqual({ items, total: 1 });

    });

  });

});
