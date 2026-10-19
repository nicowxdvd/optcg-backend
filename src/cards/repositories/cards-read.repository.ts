import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CardEntity } from "../entities/card.entity";
import { Repository } from "typeorm";

@Injectable()
export class CardsReadRepository implements CardsReadRepository {


    
    constructor(
        @InjectRepository(CardEntity) private readonly typeormRepo: Repository<CardEntity>)
    {}



    async findPage(skip: number, take: number) {
        const [items, total] = await this.typeormRepo.findAndCount({
            order: { cardCode: 'ASC', id: 'ASC' }, skip, take}
        );
        return { items, total };

    }
    
}