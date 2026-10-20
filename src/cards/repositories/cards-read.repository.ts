import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CardEntity } from '../entities/card.entity';
import { CardsReadRepositoryPort } from '../ports/cards-read.repository.port';
import { escapeLike } from '../../utils';

@Injectable()
export class CardsReadRepository implements CardsReadRepositoryPort {

    constructor(
        @InjectRepository(CardEntity) private readonly typeormRepo: Repository<CardEntity>)
    {}


    async findPage(skip: number, take: number, name?: string) {
        const [items, total] = await this.typeormRepo.findAndCount({
            where: name ? { name: Like(`%${escapeLike(name)}%`) } : undefined,
            order: { cardCode: 'ASC', id: 'ASC' },
            skip,
            take,
        });

        return { items, total };

    }

}
