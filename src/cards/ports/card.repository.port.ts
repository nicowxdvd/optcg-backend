import { CardUpsertInput } from "../interfaces/CardUpsertInput";

export const CARD_REPOSITORY = Symbol('CARD_REPOSITORY');

export interface CardRepositoryPort{
    upsertMany(cards: CardUpsertInput[]) : Promise<void>;
}