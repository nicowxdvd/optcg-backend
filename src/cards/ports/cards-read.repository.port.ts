import { CardEntity } from '../entities/card.entity';
import { CardType } from '../enums/card-type.enum';

export const CARDS_READ_REPOSITORY = Symbol('CARDS_READ_REPOSITORY');

export interface CardFilters {
    q?       : string;
    name?    : string;
    code?    : string;
    codes?   : string[];
    cost?    : number;
    costMin? : number;
    costMax? : number;
    trait?   : string;
    color?   : string;
    type?    : CardType;   
}

export interface CardsReadRepositoryPort {
    findPage(skip: number, take: number, filters : CardFilters) : Promise<{ items: CardEntity[]; total: number }>;

}
