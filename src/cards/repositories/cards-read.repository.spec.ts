import { Brackets, Repository, WhereExpressionBuilder } from 'typeorm';
import { CardsReadRepository } from './cards-read.repository';
import { CardEntity } from '../entities/card.entity';
import { traitExists } from '../../utils/utils';

// @nestjs/typeorm 12 es ESM puro y jest (CommonJS) no lo carga; solo se necesita el decorador
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

const traitClause = traitExists('card', 'card_trait', 'card_id', 'trait');

describe('CardsReadRepository', () => {

  let repository: CardsReadRepository;
  let createQueryBuilder: jest.Mock;
  let qb: Record<string, jest.Mock>;

  beforeEach(() => {
    qb = {};

    for (const method of ['orderBy', 'addOrderBy', 'skip', 'take', 'andWhere'])
      qb[method] = jest.fn().mockReturnValue(qb);

    qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

    createQueryBuilder = jest.fn().mockReturnValue(qb);

    repository = new CardsReadRepository({ createQueryBuilder } as unknown as Repository<CardEntity>);

  });


  describe('findPage', () => {

    it('sin filtros no agrega condiciones y ordena por código e id', async () => {
      await repository.findPage(0, 20, {});

      expect(createQueryBuilder).toHaveBeenCalledWith('card');
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('card.cardCode', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('card.id', 'ASC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);

    });


    it('filtra code por prefijo', async () => {
      await repository.findPage(0, 20, { code: 'OP01' });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('card.cardCode LIKE :code', { code: 'OP01%' });

    });


    it('filtra name por contenido', async () => {
      await repository.findPage(0, 20, { name: 'izo' });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('card.name LIKE :name', { name: '%izo%' });

    });


    it('combina name y code con la paginación', async () => {
      await repository.findPage(10, 5, { name: 'izo', code: 'OP01-001' });

      expect(qb.andWhere).toHaveBeenCalledTimes(2);
      expect(qb.andWhere).toHaveBeenCalledWith('card.name LIKE :name', { name: '%izo%' });
      expect(qb.andWhere).toHaveBeenCalledWith('card.cardCode LIKE :code', { code: 'OP01-001%' });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);

    });


    it('escapa los comodines de code', async () => {
      await repository.findPage(0, 20, { code: 'OP_01%' });

      expect(qb.andWhere).toHaveBeenCalledWith('card.cardCode LIKE :code', { code: 'OP\\_01\\%%' });

    });


    it('filtra trait por contenido con la subconsulta de traits', async () => {
      await repository.findPage(0, 20, { trait: 'straw' });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%straw%' });

    });


    it('escapa los comodines de trait', async () => {
      await repository.findPage(0, 20, { trait: 'Straw_Hat%' });

      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%Straw\\_Hat\\%%' });

    });


    it('combina trait con name, cost y la paginación', async () => {
      await repository.findPage(10, 5, { name: 'izo', trait: 'straw', cost: 3 });

      expect(qb.andWhere).toHaveBeenCalledTimes(3);
      expect(qb.andWhere).toHaveBeenCalledWith('card.name LIKE :name', { name: '%izo%' });
      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%straw%' });
      expect(qb.andWhere).toHaveBeenCalledWith('card.cost = :cost', { cost: 3 });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);

    });


    it('filtra cost por valor exacto', async () => {
      await repository.findPage(0, 20, { cost: 3 });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('card.cost = :cost', { cost: 3 });

    });


    it('filtra cost 0 sin descartarlo', async () => {
      await repository.findPage(0, 20, { cost: 0 });

      expect(qb.andWhere).toHaveBeenCalledWith('card.cost = :cost', { cost: 0 });

    });


    it('filtra por rango con costMin y costMax', async () => {
      await repository.findPage(0, 20, { costMin: 2, costMax: 5 });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('card.cost BETWEEN :costMin AND :costMax', { costMin: 2, costMax: 5 });

    });


    it('filtra con costMin igual a costMax', async () => {
      await repository.findPage(0, 20, { costMin: 3, costMax: 3 });

      expect(qb.andWhere).toHaveBeenCalledWith('card.cost BETWEEN :costMin AND :costMax', { costMin: 3, costMax: 3 });

    });


    it('filtra solo con costMin', async () => {
      await repository.findPage(0, 20, { costMin: 4 });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('card.cost >= :costMin', { costMin: 4 });

    });


    it('filtra solo con costMax', async () => {
      await repository.findPage(0, 20, { costMax: 4 });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('card.cost <= :costMax', { costMax: 4 });

    });


    it('filtra costMin 0 sin descartarlo', async () => {
      await repository.findPage(0, 20, { costMin: 0, costMax: 2 });

      expect(qb.andWhere).toHaveBeenCalledWith('card.cost BETWEEN :costMin AND :costMax', { costMin: 0, costMax: 2 });

    });


    it('combina cost con name, code y la paginación', async () => {
      await repository.findPage(10, 5, { name: 'izo', code: 'OP01', cost: 3 });

      expect(qb.andWhere).toHaveBeenCalledTimes(3);
      expect(qb.andWhere).toHaveBeenCalledWith('card.name LIKE :name', { name: '%izo%' });
      expect(qb.andWhere).toHaveBeenCalledWith('card.cardCode LIKE :code', { code: 'OP01%' });
      expect(qb.andWhere).toHaveBeenCalledWith('card.cost = :cost', { cost: 3 });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);

    });


    it('combina el rango de cost con name y la paginación', async () => {
      await repository.findPage(20, 10, { name: 'izo', costMin: 2, costMax: 5 });

      expect(qb.andWhere).toHaveBeenCalledTimes(2);
      expect(qb.andWhere).toHaveBeenCalledWith('card.name LIKE :name', { name: '%izo%' });
      expect(qb.andWhere).toHaveBeenCalledWith('card.cost BETWEEN :costMin AND :costMax', { costMin: 2, costMax: 5 });
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);

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
        expect(inner.where).toHaveBeenCalledWith('card.name LIKE :q');
        expect(inner.orWhere).toHaveBeenCalledTimes(2);
        expect(inner.orWhere).toHaveBeenCalledWith('card.cardCode LIKE :q');
        expect(inner.orWhere).toHaveBeenCalledWith(traitExists('card', 'card_trait', 'card_id', 'q'));

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
        await repository.findPage(10, 5, { q: 'luffy', name: 'izo', cost: 3 });

        expect(qb.andWhere).toHaveBeenCalledTimes(3);
        expect(qb.andWhere).toHaveBeenCalledWith(expect.any(Brackets), { q: '%luffy%' });
        expect(qb.andWhere).toHaveBeenCalledWith('card.name LIKE :name', { name: '%izo%' });
        expect(qb.andWhere).toHaveBeenCalledWith('card.cost = :cost', { cost: 3 });
        expect(qb.skip).toHaveBeenCalledWith(10);
        expect(qb.take).toHaveBeenCalledWith(5);

      });


      it('q vacío no agrega condiciones', async () => {
        await repository.findPage(0, 20, { q: '' });

        expect(qb.andWhere).not.toHaveBeenCalled();

      });

    });


    it('devuelve items y total', async () => {
      const items = [{ externalId: 'OP01-001' }] as CardEntity[];
      qb.getManyAndCount.mockResolvedValue([items, 1]);

      await expect(repository.findPage(0, 20, {})).resolves.toEqual({ items, total: 1 });

    });

  });

});
