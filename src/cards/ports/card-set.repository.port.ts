export const CARD_SET_REPOSITORY = Symbol('CARD_SET_REPOSITORY');

export interface CardSetRepositoryPort{
    upsertByName(name:string, code: string | null) : Promise<number>;
}