import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { CardEntity } from '../entities/card.entity';
import { CardFilters, CardsReadRepositoryPort } from '../ports/cards-read.repository.port';
import { escapeLike } from '../../utils/utils';

@Injectable()
export class CardsReadRepository implements CardsReadRepositoryPort {

    constructor(
        @InjectRepository(CardEntity) private readonly typeormRepo: Repository<CardEntity>)
    {}


    async findPage(skip: number, take: number,  { name, code }: CardFilters) {
        const where: FindOptionsWhere<CardEntity> = {};
        if (name)
            where.name = Like(`%${escapeLike(name)}%`);

        if (code)
            where.cardCode = Like(`${escapeLike(code)}%`);

        const [items, total] = await this.typeormRepo.findAndCount({
            where: where,
            order: { cardCode: 'ASC', id: 'ASC' },
            skip,
            take,
        });

        return { items, total };

    }

}
