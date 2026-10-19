import { CardUpsertInput } from "../interfaces/card-upsert-input.interface";

export const CARD_REPOSITORY = Symbol('CARD_REPOSITORY');

export interface CardRepositoryPort{
    upsertMany(cards: CardUpsertInput[]) : Promise<void>;
}