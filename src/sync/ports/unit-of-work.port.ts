import { CardSetRepositoryPort } from "./card-set.repository.port";
import { CardRepositoryPort } from "./card.repository.port";
import { LeaderRepositoryPort } from "./leader.repository.port";
import { SyncFileRepositoryPort } from "./sync-files.repository.port";
import { TraitRepositoryPort } from "./trait.repository.port";

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

export interface TransactionalRepositories {
    cardSets  : CardSetRepositoryPort;
    syncFiles : SyncFileRepositoryPort;
    traits    : TraitRepositoryPort;
    leaders   : LeaderRepositoryPort;
    cards     : CardRepositoryPort;
}

export interface UnitOfWorkPort {
    run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T>;
}