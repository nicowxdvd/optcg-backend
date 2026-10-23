import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { escapeLike } from '../../utils/utils';
import { LeaderFilters, LeadersReadRepositoryPort } from '../ports/leaders-read.repository.port';
import { LeaderEntity } from '../../cards/entities/leader.entity';

@Injectable()
export class LeadersReadRepository implements LeadersReadRepositoryPort {

    constructor(
        @InjectRepository(LeaderEntity) private readonly typeormRepo: Repository<LeaderEntity>)
    {}


    async findPage(skip: number, take: number,  { name, code, color }: LeaderFilters) {
        const where: FindOptionsWhere<LeaderEntity> = {};
        if (name)
            where.name = Like(`%${escapeLike(name)}%`);

        if (code)
            where.cardCode = Like(`${escapeLike(code)}%`);

        if (color)
            where.color = Like(`%${escapeLike(color)}%`);

        const [items, total] = await this.typeormRepo.findAndCount({
            where: where,
            relations: { set: true, traits: true },
            order: { cardCode: 'ASC', id: 'ASC' },
            skip,
            take,
        });

        return { items, total };

    }

}
