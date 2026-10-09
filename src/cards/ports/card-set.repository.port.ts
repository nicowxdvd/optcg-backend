export const CARD_SET_REPOSITORY = Symbol('CARD_SET_REPOSITORY');

export interface CardSetRepositoryPort{
    upsertByCode(code:string, name: string) : Promise<number>;
}