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

    async upsertByCode(code: string, name: string): Promise<number> {
        await this.repository.upsert({code, name}, ['code']);
        const  cardSet = await this.repository.findOneByOrFail({code})
        return cardSet.id;
    }
}