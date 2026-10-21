import { LeaderEntity } from '../../cards/entities/leader.entity';

export const LEADERS_READ_REPOSITORY = Symbol('LEADERS_READ_REPOSITORY');

export interface LeaderFilters {
    name?  : string;
    code?  : string;
    color? : string;

}

export interface LeadersReadRepositoryPort {
    findPage(skip: number, take: number, filters: LeaderFilters) : Promise<{ items: LeaderEntity[]; total: number }>;

}
