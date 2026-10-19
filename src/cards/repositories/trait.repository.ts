import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TraitRepositoryPort } from '../ports/trait.repository.port';
import { TraitEntity } from '../entities/trait.entity';

@Injectable()
export class TraitRepository implements TraitRepositoryPort{

    constructor(
        @InjectRepository(TraitEntity)
        private readonly repository: Repository<TraitEntity>
    ){}


    async findByNames(names: string[]): Promise<TraitEntity[]> {
        if (!names.length)
            return [];

        return await this.repository.find({
            where:{
                name: In(names)
            }
        });
    }



    async upsertByNames(names: string[]): Promise<TraitEntity[]> {
        if(!names.length)
            return [];

        const uniqueNames = [...new Set(names)];
        await this.repository.createQueryBuilder()
                             .insert()
                             .into(TraitEntity)
                             .values(uniqueNames.map((name) => ({ name })))
                             .orIgnore()
                             .updateEntity(false)
                             .execute();

        return await this.findByNames(uniqueNames);
    }




}

