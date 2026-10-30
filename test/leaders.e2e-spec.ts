import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Brackets, Repository, WhereExpressionBuilder } from 'typeorm';
import { LeaderEntity } from '../src/cards/entities/leader.entity';
import { LeadersController } from '../src/leaders/leaders.controller';
import { LeadersService } from '../src/leaders/leaders.service';
import { LEADERS_READ_REPOSITORY } from '../src/leaders/ports/leaders-read.repository.port';
import { LeadersReadRepository } from '../src/leaders/repositories/leaders-read.repository';
import { traitExists } from '../src/utils/utils';

const makeLeader = (externalId: string, cardCode: string) => ({ externalId, cardCode, name: 'Monkey.D.Luffy', rarity: 'L', color: 'Red', life: 5, power: 5000, attribute: 'Strike', effect: null, imageUrl: 'https://img/luffy.png', set: { name: 'Romance Dawn' }, traits: [{ name: 'Supernovas' }, { name: 'Straw Hat Crew' }] }) as LeaderEntity;

const traitClause = traitExists('leader', 'leader_trait', 'leader_id', 'trait');

const runBrackets = (brackets: Brackets) => {
  const inner = { where: jest.fn(), orWhere: jest.fn() };
  inner.where.mockReturnValue(inner);
  inner.orWhere.mockReturnValue(inner);

  brackets.whereFactory(inner as unknown as WhereExpressionBuilder);

  return inner;
};

// @nestjs/typeorm 12 es ESM puro y jest (CommonJS) no lo carga; solo se necesita el decorador
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

describe('GET /v1/leaders (e2e)', () => {

  let app: INestApplication;
  let qb: Record<string, jest.Mock>;
  let getManyAndCount: jest.Mock;

  beforeEach(async () => {
    qb = {};

    for (const method of ['leftJoinAndSelect', 'orderBy', 'addOrderBy', 'skip', 'take', 'andWhere'])
      qb[method] = jest.fn().mockReturnValue(qb);

    getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
    qb.getManyAndCount = getManyAndCount;

    const moduleRef = await Test.createTestingModule({
      controllers: [LeadersController],
      providers: [
        LeadersService,
        { provide: LEADERS_READ_REPOSITORY, useFactory: () => new LeadersReadRepository({ createQueryBuilder: jest.fn().mockReturnValue(qb) } as unknown as Repository<LeaderEntity>) },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

  });


  afterEach(async () => {
    await app.close();

  });


  it('sin filtros devuelve la primera página con los leaders mapeados', async () => {
    getManyAndCount.mockResolvedValue([[makeLeader('OP01-001', 'OP01-001')], 1]);

    const response = await request(app.getHttpServer()).get('/v1/leaders').expect(200);

    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('leader.set', 'set');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('leader.traits', 'traits');
    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('leader.cardCode', 'ASC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('leader.id', 'ASC');
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(20);
    expect(response.body).toEqual({
      items: [{ externalId: 'OP01-001', cardCode: 'OP01-001', name: 'Monkey.D.Luffy', rarity: 'L', color: 'Red', life: 5, power: 5000, attribute: 'Strike', effect: null, imageUrl: 'https://img/luffy.png', set: 'Romance Dawn', traits: ['Straw Hat Crew', 'Supernovas'] }],
      total: 1,
      page: 1,
      totalPages: 1,
    });

  });


  it('code en minúsculas se normaliza a mayúsculas', async () => {
    await request(app.getHttpServer()).get('/v1/leaders').query({ code: 'op01-001' }).expect(200);

    expect(qb.andWhere).toHaveBeenCalledWith('leader.cardCode LIKE :code', { code: 'OP01-001%' });

  });


  it('color se normaliza a mayúsculas y filtra por contenido', async () => {
    await request(app.getHttpServer()).get('/v1/leaders').query({ color: 'red/green' }).expect(200);

    expect(qb.andWhere).toHaveBeenCalledWith('leader.color LIKE :color', { color: '%RED/GREEN%' });

  });


  it('combina filtros con paginación', async () => {
    getManyAndCount.mockResolvedValue([[], 12]);

    const response = await request(app.getHttpServer()).get('/v1/leaders').query({ code: 'OP01', name: 'luffy', color: 'red', page: 2, limit: 5 }).expect(200);

    expect(qb.andWhere).toHaveBeenCalledTimes(3);
    expect(qb.andWhere).toHaveBeenCalledWith('leader.name LIKE :name', { name: '%luffy%' });
    expect(qb.andWhere).toHaveBeenCalledWith('leader.cardCode LIKE :code', { code: 'OP01%' });
    expect(qb.andWhere).toHaveBeenCalledWith('leader.color LIKE :color', { color: '%RED%' });
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(response.body).toMatchObject({ total: 12, page: 2, totalPages: 3 });

  });


  it('filtros vacíos no filtran', async () => {
    await request(app.getHttpServer()).get('/v1/leaders').query({ name: '', code: '', color: '', trait: '', q: '' }).expect(200);

    expect(qb.andWhere).not.toHaveBeenCalled();

  });


  describe('búsqueda q', () => {

    it('q busca en name, code y trait unidos con OR', async () => {
      getManyAndCount.mockResolvedValue([[makeLeader('OP01-001', 'OP01-001')], 1]);

      const response = await request(app.getHttpServer()).get('/v1/leaders').query({ q: 'luffy' }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith(expect.any(Brackets), { q: '%luffy%' });

      const inner = runBrackets(qb.andWhere.mock.calls[0][0]);

      expect(inner.where).toHaveBeenCalledWith('leader.name LIKE :q');
      expect(inner.orWhere).toHaveBeenCalledWith('leader.cardCode LIKE :q');
      expect(inner.orWhere).toHaveBeenCalledWith(traitExists('leader', 'leader_trait', 'leader_id', 'q'));
      expect(response.body.total).toBe(1);

    });


    it('el leader encontrado por q conserva todos sus traits', async () => {
      getManyAndCount.mockResolvedValue([[makeLeader('OP01-001', 'OP01-001')], 1]);

      const response = await request(app.getHttpServer()).get('/v1/leaders').query({ q: 'supernovas' }).expect(200);

      expect(response.body.items[0].traits).toEqual(['Straw Hat Crew', 'Supernovas']);

    });


    it('q se recorta y conserva las mayúsculas', async () => {
      await request(app.getHttpServer()).get('/v1/leaders').query({ q: '  Supernovas  ' }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledWith(expect.any(Brackets), { q: '%Supernovas%' });

    });


    it('q vacío no filtra', async () => {
      await request(app.getHttpServer()).get('/v1/leaders').query({ q: '' }).expect(200);

      expect(qb.andWhere).not.toHaveBeenCalled();

    });


    it('combina q con color, trait y paginación mediante AND', async () => {
      getManyAndCount.mockResolvedValue([[], 7]);

      const response = await request(app.getHttpServer()).get('/v1/leaders').query({ q: 'luffy', color: 'red', trait: 'straw', page: 2, limit: 5 }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledTimes(3);
      expect(qb.andWhere).toHaveBeenCalledWith(expect.any(Brackets), { q: '%luffy%' });
      expect(qb.andWhere).toHaveBeenCalledWith('leader.color LIKE :color', { color: '%RED%' });
      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%straw%' });
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(response.body).toMatchObject({ total: 7, page: 2, totalPages: 2 });

    });


    it('q de más de 100 caracteres devuelve 400', async () => {
      const response = await request(app.getHttpServer()).get('/v1/leaders').query({ q: 'A'.repeat(101) }).expect(400);

      expect(response.body.message).toContain('q debe tener como máximo 100 caracteres');
      expect(getManyAndCount).not.toHaveBeenCalled();

    });

  });


  describe('filtro por trait', () => {

    it('trait filtra por contenido con la subconsulta de traits', async () => {
      getManyAndCount.mockResolvedValue([[makeLeader('OP01-001', 'OP01-001')], 1]);

      const response = await request(app.getHttpServer()).get('/v1/leaders').query({ trait: 'Straw Hat' }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%Straw Hat%' });
      expect(response.body.total).toBe(1);

    });


    it('el leader filtrado por trait conserva todos sus traits', async () => {
      getManyAndCount.mockResolvedValue([[makeLeader('OP01-001', 'OP01-001')], 1]);

      const response = await request(app.getHttpServer()).get('/v1/leaders').query({ trait: 'supernovas' }).expect(200);

      expect(response.body.items[0].traits).toEqual(['Straw Hat Crew', 'Supernovas']);

    });


    it('trait se recorta y conserva las mayúsculas', async () => {
      await request(app.getHttpServer()).get('/v1/leaders').query({ trait: '  Supernovas  ' }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%Supernovas%' });

    });


    it('combina trait con color, name y paginación', async () => {
      getManyAndCount.mockResolvedValue([[], 7]);

      const response = await request(app.getHttpServer()).get('/v1/leaders').query({ trait: 'straw', color: 'red', name: 'lu', page: 2, limit: 5 }).expect(200);

      expect(qb.andWhere).toHaveBeenCalledTimes(3);
      expect(qb.andWhere).toHaveBeenCalledWith('leader.name LIKE :name', { name: '%lu%' });
      expect(qb.andWhere).toHaveBeenCalledWith('leader.color LIKE :color', { color: '%RED%' });
      expect(qb.andWhere).toHaveBeenCalledWith(traitClause, { trait: '%straw%' });
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(response.body).toMatchObject({ total: 7, page: 2, totalPages: 2 });

    });


    it('trait de más de 50 caracteres devuelve 400', async () => {
      const response = await request(app.getHttpServer()).get('/v1/leaders').query({ trait: 'A'.repeat(51) }).expect(400);

      expect(response.body.message).toContain('trait debe tener como máximo 50 caracteres');
      expect(getManyAndCount).not.toHaveBeenCalled();

    });

  });


  it('code de más de 20 caracteres devuelve 400', async () => {
    const response = await request(app.getHttpServer()).get('/v1/leaders').query({ code: 'A'.repeat(21) }).expect(400);

    expect(response.body.message).toContain('code debe tener como máximo 20 caracteres');
    expect(getManyAndCount).not.toHaveBeenCalled();

  });


  it('page menor a 1 devuelve 400', async () => {
    const response = await request(app.getHttpServer()).get('/v1/leaders').query({ page: 0 }).expect(400);

    expect(response.body.message).toContain('page debe ser mayor o igual a 1');
    expect(getManyAndCount).not.toHaveBeenCalled();

  });


  it('limit mayor a 500 devuelve 400', async () => {
    const response = await request(app.getHttpServer()).get('/v1/leaders').query({ limit: 501 }).expect(400);

    expect(response.body.message).toContain('limit debe ser menor o igual a 500');
    expect(getManyAndCount).not.toHaveBeenCalled();

  });

});
