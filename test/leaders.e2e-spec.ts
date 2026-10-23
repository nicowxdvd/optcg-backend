import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Like, Repository } from 'typeorm';
import { LeaderEntity } from '../src/cards/entities/leader.entity';
import { LeadersController } from '../src/leaders/leaders.controller';
import { LeadersService } from '../src/leaders/leaders.service';
import { LEADERS_READ_REPOSITORY } from '../src/leaders/ports/leaders-read.repository.port';
import { LeadersReadRepository } from '../src/leaders/repositories/leaders-read.repository';

const makeLeader = (externalId: string, cardCode: string) => ({ externalId, cardCode, name: 'Monkey.D.Luffy', rarity: 'L', color: 'Red', life: 5, power: 5000, attribute: 'Strike', effect: null, imageUrl: 'https://img/luffy.png', set: { name: 'Romance Dawn' }, traits: [{ name: 'Supernovas' }, { name: 'Straw Hat Crew' }] }) as LeaderEntity;

// @nestjs/typeorm 12 es ESM puro y jest (CommonJS) no lo carga; solo se necesita el decorador
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

describe('GET /v1/leaders (e2e)', () => {

  let app: INestApplication;
  let findAndCount: jest.Mock;

  beforeEach(async () => {
    findAndCount = jest.fn().mockResolvedValue([[], 0]);

    const moduleRef = await Test.createTestingModule({
      controllers: [LeadersController],
      providers: [
        LeadersService,
        { provide: LEADERS_READ_REPOSITORY, useFactory: () => new LeadersReadRepository({ findAndCount } as unknown as Repository<LeaderEntity>) },
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
    findAndCount.mockResolvedValue([[makeLeader('OP01-001', 'OP01-001')], 1]);

    const response = await request(app.getHttpServer()).get('/v1/leaders').expect(200);

    expect(findAndCount).toHaveBeenCalledWith({ where: {}, relations: { set: true, traits: true }, order: { cardCode: 'ASC', id: 'ASC' }, skip: 0, take: 20 });
    expect(response.body).toEqual({
      items: [{ externalId: 'OP01-001', cardCode: 'OP01-001', name: 'Monkey.D.Luffy', rarity: 'L', color: 'Red', life: 5, power: 5000, attribute: 'Strike', effect: null, imageUrl: 'https://img/luffy.png', set: 'Romance Dawn', traits: ['Straw Hat Crew', 'Supernovas'] }],
      total: 1,
      page: 1,
      totalPages: 1,
    });

  });


  it('code en minúsculas se normaliza a mayúsculas', async () => {
    await request(app.getHttpServer()).get('/v1/leaders').query({ code: 'op01-001' }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cardCode: Like('OP01-001%') } }));

  });


  it('color se normaliza a mayúsculas y filtra por contenido', async () => {
    await request(app.getHttpServer()).get('/v1/leaders').query({ color: 'red/green' }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { color: Like('%RED/GREEN%') } }));

  });


  it('combina filtros con paginación', async () => {
    findAndCount.mockResolvedValue([[], 12]);

    const response = await request(app.getHttpServer()).get('/v1/leaders').query({ code: 'OP01', name: 'luffy', color: 'red', page: 2, limit: 5 }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { name: Like('%luffy%'), cardCode: Like('OP01%'), color: Like('%RED%') }, skip: 5, take: 5 }));
    expect(response.body).toMatchObject({ total: 12, page: 2, totalPages: 3 });

  });


  it('filtros vacíos no filtran', async () => {
    await request(app.getHttpServer()).get('/v1/leaders').query({ name: '', code: '', color: '' }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));

  });


  it('code de más de 20 caracteres devuelve 400', async () => {
    const response = await request(app.getHttpServer()).get('/v1/leaders').query({ code: 'A'.repeat(21) }).expect(400);

    expect(response.body.message).toContain('code debe tener como máximo 20 caracteres');
    expect(findAndCount).not.toHaveBeenCalled();

  });


  it('page menor a 1 devuelve 400', async () => {
    const response = await request(app.getHttpServer()).get('/v1/leaders').query({ page: 0 }).expect(400);

    expect(response.body.message).toContain('page debe ser mayor o igual a 1');
    expect(findAndCount).not.toHaveBeenCalled();

  });


  it('limit mayor a 500 devuelve 400', async () => {
    const response = await request(app.getHttpServer()).get('/v1/leaders').query({ limit: 501 }).expect(400);

    expect(response.body.message).toContain('limit debe ser menor o igual a 500');
    expect(findAndCount).not.toHaveBeenCalled();

  });

});
