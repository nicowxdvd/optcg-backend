import { CardEntity } from '../entities/card.entity';

export const CARDS_READ_REPOSITORY = Symbol('CARDS_READ_REPOSITORY');

export interface CardFilters {
    q?       : string;
    name?    : string;
    code?    : string;
    cost?    : number;
    costMin? : number;
    costMax? : number;
    trait?   : string;   
}

export interface CardsReadRepositoryPort {
    findPage(skip: number, take: number, filters : CardFilters) : Promise<{ items: CardEntity[]; total: number }>;

}
