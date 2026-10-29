import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, Like, MoreThanOrEqual, Repository } from 'typeorm';
import { CardEntity } from '../entities/card.entity';
import { CardFilters, CardsReadRepositoryPort } from '../ports/cards-read.repository.port';
import { escapeLike } from '../../utils/utils';

@Injectable()
export class CardsReadRepository implements CardsReadRepositoryPort {

    constructor(
        @InjectRepository(CardEntity) private readonly typeormRepo: Repository<CardEntity>)
    {}


    async findPage(skip: number, take: number,  { name, code, cost, costMin, costMax }: CardFilters) {
        const where: FindOptionsWhere<CardEntity> = {};
        if (name)
            where.name = Like(`%${escapeLike(name)}%`);

        if (code)
            where.cardCode = Like(`${escapeLike(code)}%`);

        if (cost !== undefined)
            where.cost = cost;
        else if (costMin !== undefined && costMax !== undefined)
            where.cost = Between(costMin, costMax);

        else if (costMin !== undefined)
            where.cost = MoreThanOrEqual(costMin);
        
        else if (costMax !== undefined)
            where.cost = LessThanOrEqual(costMax);

        const [items, total] = await this.typeormRepo.findAndCount({
            where: where,
            order: { cardCode: 'ASC', id: 'ASC' },
            skip,
            take,
        });

        return { items, total };

    }

}
