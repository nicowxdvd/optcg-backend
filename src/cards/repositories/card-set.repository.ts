import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CardSetRepositoryPort } from "../ports/card-set.repository.port";
import { Repository } from "typeorm";
import { CardSetEntity } from "./entities/card-set.entity";

@Injectable()
export class CardSetRepository implements CardSetRepositoryPort{

    constructor(
        @InjectRepository(CardSetEntity)
        private readonly repository: Repository<CardSetEntity>
    ){}

    async upsertByName(name: string, code: string | null): Promise<number> {
        await this.repository.upsert({name, code}, ['name']);
        const  cardSet = await this.repository.findOneByOrFail({name})
        return cardSet.id;
    }
}