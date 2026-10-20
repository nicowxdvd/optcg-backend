import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Like, Repository } from 'typeorm';
import { CardsController } from '../src/cards/cards.controller';
import { CardsService } from '../src/cards/cards.service';
import { CardEntity } from '../src/cards/entities/card.entity';
import { CardType } from '../src/cards/enums/card-type.enum';
import { CARDS_READ_REPOSITORY } from '../src/cards/ports/cards-read.repository.port';
import { CardsReadRepository } from '../src/cards/repositories/cards-read.repository';

const makeCard = (externalId: string, cardCode: string) => ({ externalId, cardCode, name: 'Luffy', type: CardType.CHARACTER, rarity: 'R', color: 'Red', cost: 5, power: 7000, counterValue: null, attribute: 'Ranged', effect: null, triggerEffect: null, imageUrl: 'https://img/luffy.png' }) as CardEntity;

// @nestjs/typeorm 12 es ESM puro y jest (CommonJS) no lo carga; solo se necesita el decorador
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

describe('GET /v1/cards (e2e)', () => {

  let app: INestApplication;
  let findAndCount: jest.Mock;

  beforeEach(async () => {
    findAndCount = jest.fn().mockResolvedValue([[], 0]);

    const moduleRef = await Test.createTestingModule({
      controllers: [CardsController],
      providers: [
        CardsService,
        { provide: CARDS_READ_REPOSITORY, useFactory: () => new CardsReadRepository({ findAndCount } as unknown as Repository<CardEntity>) },
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


  it('code exacto devuelve la carta y sus variantes', async () => {
    const items = [makeCard('OP01-001', 'OP01-001'), makeCard('OP01-001_p1', 'OP01-001')];
    findAndCount.mockResolvedValue([items, 2]);

    const response = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01-001' }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cardCode: Like('OP01-001%') } }));
    expect(response.body.total).toBe(2);
    expect(response.body.items.map((item: { externalId: string }) => item.externalId)).toEqual(['OP01-001', 'OP01-001_p1']);

  });


  it('code en minúsculas se normaliza a mayúsculas', async () => {
    await request(app.getHttpServer()).get('/v1/cards').query({ code: 'op01-001' }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cardCode: Like('OP01-001%') } }));

  });


  it('prefijo de set devuelve todo el set', async () => {
    const items = [makeCard('OP01-001', 'OP01-001'), makeCard('OP01-002', 'OP01-002'), makeCard('OP01-003', 'OP01-003')];
    findAndCount.mockResolvedValue([items, 3]);

    const response = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01' }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { cardCode: Like('OP01%') } }));
    expect(response.body.items).toHaveLength(3);

  });


  it('combina code con name y paginación', async () => {
    findAndCount.mockResolvedValue([[], 12]);

    const response = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'OP01', name: 'luffy', page: 2, limit: 5 }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith({ where: { name: Like('%luffy%'), cardCode: Like('OP01%') }, order: { cardCode: 'ASC', id: 'ASC' }, skip: 5, take: 5 });
    expect(response.body).toMatchObject({ total: 12, page: 2, totalPages: 3 });

  });


  it('code vacío no filtra', async () => {
    await request(app.getHttpServer()).get('/v1/cards').query({ code: '' }).expect(200);

    expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));

  });


  it('code de más de 20 caracteres devuelve 400', async () => {
    const response = await request(app.getHttpServer()).get('/v1/cards').query({ code: 'A'.repeat(21) }).expect(400);

    expect(response.body.message).toContain('code debe tener como máximo 20 caracteres');
    expect(findAndCount).not.toHaveBeenCalled();

  });

});
