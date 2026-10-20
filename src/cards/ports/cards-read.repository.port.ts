import { CardEntity } from '../entities/card.entity';

export const CARDS_READ_REPOSITORY = Symbol('CARDS_READ_REPOSITORY');

export interface CardsReadRepositoryPort {
    findPage(skip: number, take: number, name?: string) : Promise<{ items: CardEntity[]; total: number }>;

}
