import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { escapeLike, traitExists } from '../../utils/utils';
import { LeaderFilters, LeadersReadRepositoryPort } from '../ports/leaders-read.repository.port';
import { LeaderEntity } from '../../cards/entities/leader.entity';

@Injectable()
export class LeadersReadRepository implements LeadersReadRepositoryPort {

    constructor(
        @InjectRepository(LeaderEntity) private readonly typeormRepo: Repository<LeaderEntity>)
    {}


    async findPage(skip: number, take: number,  { name, code, color, trait }: LeaderFilters) {
        const qb = this.typeormRepo.createQueryBuilder('leader')
            .leftJoinAndSelect('leader.set', 'set')
            .leftJoinAndSelect('leader.traits', 'traits')
            .orderBy('leader.cardCode', 'ASC')
            .addOrderBy('leader.id', 'ASC')
            .skip(skip)
            .take(take);

        if (name)
            qb.andWhere('leader.name LIKE :name', { name: `%${escapeLike(name)}%` });

        if (code)
            qb.andWhere('leader.cardCode LIKE :code', { code: `${escapeLike(code)}%` });

        if (color)
            qb.andWhere('leader.color LIKE :color', { color: `%${escapeLike(color)}%` });

        if (trait)
            qb.andWhere(traitExists('leader', 'leader_trait', 'leader_id', 'trait'), { trait: `%${escapeLike(trait)}%` });

        const [items, total] = await qb.getManyAndCount();

        return { items, total };

    }

}
