import { CardEntity } from "../entities/card.entity";

export const CARDS_READ_REPOSITORY = Symbol('CARDS_READ_REPOSITORY');

export interface CardRepositoryPort{
    findPage(skip: number, take: number) : Promise<{ items: CardEntity[]; total: number }>;

}