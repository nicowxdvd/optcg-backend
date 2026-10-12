import { TraitEntity } from "../repositories/entities/trait.entity";

export const TRAIT_REPOSITORY = Symbol('TRAIT_REPOSITORY');

export interface TraitRepositoryPort{
    findByNames(names: string[])   : Promise<TraitEntity[]>
    upsertByNames(names: string[]) : Promise<TraitEntity[]>,
}