import { LeaderUpsertInput } from "../interfaces/leader-upsert-input.interface";

export const LEADER_REPOSITORY = Symbol('LEADER_REPOSITORY');

export interface LeaderRepositoryPort{
    upsertMany(leaders: LeaderUpsertInput[]) : Promise<void>;
}