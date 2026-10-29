import { CardEntity } from '../entities/card.entity';

export const CARDS_READ_REPOSITORY = Symbol('CARDS_READ_REPOSITORY');

export interface CardFilters {
    name?: string;
    code?: string;
    cost?: number;
    costMin?: number;
    costMax?: number;    
}

export interface CardsReadRepositoryPort {
    findPage(skip: number, take: number, filters : CardFilters) : Promise<{ items: CardEntity[]; total: number }>;

}
