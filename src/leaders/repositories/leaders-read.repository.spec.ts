import { Brackets, Repository, WhereExpressionBuilder } from 'typeorm';
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


    describe('q', () => {

      const runBrackets = (brackets: Brackets) => {
        const inner = { where: jest.fn(), orWhere: jest.fn() };
        inner.where.mockReturnValue(inner);
        inner.orWhere.mockReturnValue(inner);

        brackets.whereFactory(inner as unknown as WhereExpressionBuilder);

        return inner;
      };


      it('agrega un solo bloque Brackets con el parámetro q', async () => {
        await repository.findPage(0, 20, { q: 'luffy' });

        expect(qb.andWhere).toHaveBeenCalledTimes(1);
        expect(qb.andWhere).toHaveBeenCalledWith(expect.any(Brackets), { q: '%luffy%' });

      });


      it('busca en name, code y trait unidos con OR', async () => {
        await repository.findPage(0, 20, { q: 'luffy' });

        const inner = runBrackets(qb.andWhere.mock.calls[0][0]);

        expect(inner.where).toHaveBeenCalledTimes(1);
        expect(inner.where).toHaveBeenCalledWith('leader.name LIKE :q');
        expect(inner.orWhere).toHaveBeenCalledTimes(2);
        expect(inner.orWhere).toHaveBeenCalledWith('leader.cardCode LIKE :q');
        expect(inner.orWhere).toHaveBeenCalledWith(traitExists('leader', 'leader_trait', 'leader_id', 'q'));

      });


      it('busca el code por contenido y no por prefijo', async () => {
        await repository.findPage(0, 20, { q: '001' });

        expect(qb.andWhere).toHaveBeenCalledWith(expect.any(Brackets), { q: '%001%' });

      });


      it('escapa los comodines de q', async () => {
        await repository.findPage(0, 20, { q: 'a_b%' });

        expect(qb.andWhere).toHaveBeenCalledWith(expect.any(Brackets), { q: '%a\\_b\\%%' });

      });


      it('combina q con los demás filtros mediante AND', async () => {
        await repository.findPage(10, 5, { q: 'luffy', color: 'RED', trait: 'straw' });

        expect(qb.andWhere).toHaveBeenCalledTimes(3);
        expect(qb.andWhere).toHaveBeenCalledWith(expect.any(Brackets), { q: '%luffy%' });
        expect(qb.andWhere).toHaveBeenCalledWith('leader.color LIKE :color', { color: '%RED%' });
        expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%straw%' });
        expect(qb.skip).toHaveBeenCalledWith(10);
        expect(qb.take).toHaveBeenCalledWith(5);

      });


      it('q no altera el join que carga todos los traits', async () => {
        await repository.findPage(0, 20, { q: 'luffy' });

        expect(qb.leftJoinAndSelect).toHaveBeenCalledTimes(2);
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('leader.traits', 'traits');

      });


      it('q vacío no agrega condiciones', async () => {
        await repository.findPage(0, 20, { q: '' });

        expect(qb.andWhere).not.toHaveBeenCalled();

      });

    });


    it('devuelve items y total', async () => {
      const items = [{ externalId: 'OP01-001' }] as LeaderEntity[];
      qb.getManyAndCount.mockResolvedValue([items, 1]);

      await expect(repository.findPage(0, 20, {})).resolves.toEqual({ items, total: 1 });

    });

  });

});
