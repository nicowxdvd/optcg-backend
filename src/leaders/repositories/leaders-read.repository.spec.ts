import { Repository } from 'typeorm';
import { LeadersReadRepository } from './leaders-read.repository';
import { LeaderEntity } from '../../cards/entities/leader.entity';
import { traitExists } from '../../utils/utils';

// @nestjs/typeorm 12 es ESM puro y jest (CommonJS) no lo carga; solo se necesita el decorador
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

const traitClause = traitExists('leader', 'leader_trait', 'leader_id', 'trait');

describe('LeadersReadRepository', () => {

  let repository: LeadersReadRepository;
  let createQueryBuilder: jest.Mock;
  let qb: Record<string, jest.Mock>;

  beforeEach(() => {
    qb = {};

    for (const method of ['leftJoinAndSelect', 'orderBy', 'addOrderBy', 'skip', 'take', 'andWhere'])
      qb[method] = jest.fn().mockReturnValue(qb);

    qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

    createQueryBuilder = jest.fn().mockReturnValue(qb);

    repository = new LeadersReadRepository({ createQueryBuilder } as unknown as Repository<LeaderEntity>);

  });


  describe('findPage', () => {

    it('sin filtros no agrega condiciones, carga set y traits y ordena por código e id', async () => {
      await repository.findPage(0, 20, {});

      expect(createQueryBuilder).toHaveBeenCalledWith('leader');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('leader.set', 'set');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('leader.traits', 'traits');
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('leader.cardCode', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('leader.id', 'ASC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);

    });


    it('filtra code por prefijo', async () => {
      await repository.findPage(0, 20, { code: 'OP01' });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('leader.cardCode LIKE :code', { code: 'OP01%' });

    });


    it('filtra name por contenido', async () => {
      await repository.findPage(0, 20, { name: 'luffy' });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('leader.name LIKE :name', { name: '%luffy%' });

    });


    it('filtra color por contenido', async () => {
      await repository.findPage(0, 20, { color: 'RED' });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('leader.color LIKE :color', { color: '%RED%' });

    });


    it('filtra trait por contenido con la subconsulta de traits', async () => {
      await repository.findPage(0, 20, { trait: 'straw' });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%straw%' });

    });


    it('filtra trait sin tocar el join que carga todos los traits', async () => {
      await repository.findPage(0, 20, { trait: 'straw' });

      expect(qb.leftJoinAndSelect).toHaveBeenCalledTimes(2);
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('leader.traits', 'traits');

    });


    it('combina name, code, color y trait con la paginación', async () => {
      await repository.findPage(10, 5, { name: 'luffy', code: 'OP01-001', color: 'RED', trait: 'straw' });

      expect(qb.andWhere).toHaveBeenCalledTimes(4);
      expect(qb.andWhere).toHaveBeenCalledWith('leader.name LIKE :name', { name: '%luffy%' });
      expect(qb.andWhere).toHaveBeenCalledWith('leader.cardCode LIKE :code', { code: 'OP01-001%' });
      expect(qb.andWhere).toHaveBeenCalledWith('leader.color LIKE :color', { color: '%RED%' });
      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%straw%' });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);

    });


    it('escapa los comodines de name, code, color y trait', async () => {
      await repository.findPage(0, 20, { name: 'a_b', code: 'OP_01%', color: 'R%D', trait: 'Straw_Hat%' });

      expect(qb.andWhere).toHaveBeenCalledWith('leader.name LIKE :name', { name: '%a\\_b%' });
      expect(qb.andWhere).toHaveBeenCalledWith('leader.cardCode LIKE :code', { code: 'OP\\_01\\%%' });
      expect(qb.andWhere).toHaveBeenCalledWith('leader.color LIKE :color', { color: '%R\\%D%' });
      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%Straw\\_Hat\\%%' });

    });


    it('devuelve items y total', async () => {
      const items = [{ externalId: 'OP01-001' }] as LeaderEntity[];
      qb.getManyAndCount.mockResolvedValue([items, 1]);

      await expect(repository.findPage(0, 20, {})).resolves.toEqual({ items, total: 1 });

    });

  });

});
