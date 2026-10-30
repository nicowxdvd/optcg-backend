import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CardEntity } from '../entities/card.entity';
import { CardFilters, CardsReadRepositoryPort } from '../ports/cards-read.repository.port';
import { escapeLike, traitExists } from '../../utils/utils';

@Injectable()
export class CardsReadRepository implements CardsReadRepositoryPort {

    constructor(
        @InjectRepository(CardEntity) private readonly typeormRepo: Repository<CardEntity>)
    {}



    async findPage(skip: number, take: number,  { q, name, code, cost, costMin, costMax, trait }: CardFilters) {
        const qb = this.typeormRepo.createQueryBuilder('card')
            .orderBy('card.cardCode', 'ASC')
            .addOrderBy('card.id', 'ASC')
            .skip(skip)
            .take(take);

        if (q)
            qb.andWhere(
                new Brackets(w => w
                        .where('card.name LIKE :q')
                        .orWhere('card.cardCode LIKE :q')
                        .orWhere(traitExists('card', 'card_trait', 'card_id', 'q'))
                    ), { q: `%${escapeLike(q)}%` }
                );

        if (name)
            qb.andWhere('card.name LIKE :name', { name: `%${escapeLike(name)}%` });

        if (code)
            qb.andWhere('card.cardCode LIKE :code', { code: `${escapeLike(code)}%` });

        if (cost !== undefined)
            qb.andWhere('card.cost = :cost', { cost });

        else if (costMin !== undefined && costMax !== undefined)
            qb.andWhere('card.cost BETWEEN :costMin AND :costMax', { costMin, costMax });
        
        else if (costMin !== undefined)
            qb.andWhere('card.cost >= :costMin', { costMin });

        else if (costMax !== undefined)
            qb.andWhere('card.cost <= :costMax', { costMax });

        if (trait)
            qb.andWhere(traitExists('card', 'card_trait', 'card_id', 'trait'), { trait: `%${escapeLike(trait)}%` });
        
        const [items, total] = await qb.getManyAndCount();

        return { items, total };

    }

}
