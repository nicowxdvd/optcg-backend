import { Injectable } from "@nestjs/common";
import { LeaderRepositoryPort } from "../ports/leader.repository.port";
import { LeaderUpsertInput } from "../interfaces/leader-upsert-input.interface";
import { InjectRepository } from "@nestjs/typeorm";
import { LeaderEntity } from "../../cards/entities/leader.entity";
import { EntityManager, In, Repository } from "typeorm";

@Injectable()
export class LeaderRepository implements LeaderRepositoryPort{



    constructor(
        @InjectRepository(LeaderEntity)
        private readonly repository: Repository<LeaderEntity>
    ){}
    


    async upsertMany(leaders: LeaderUpsertInput[]): Promise<void> {
        if(!leaders.length)
            return;

        const manager = this.repository.manager;

        await this.upsertLeaders(manager, leaders);
        await this.syncTraits(manager, leaders);
    }



    private async upsertLeaders(manager: EntityManager, leaders: LeaderUpsertInput[]): Promise<void> {
        const metadata = manager.connection.getMetadata(LeaderEntity);
        const updatable = metadata.columns
                                .filter((c) => !c.isPrimary && !c.isCreateDate && c.propertyName !== 'externalId')
                                .map((c) => c.databaseName);

        await manager.createQueryBuilder()
                    .insert()
                    .into(LeaderEntity)
                    .values(leaders.map(({ setId, ...leader }) => ({ ...leader, set: { id: setId } })))
                    .orUpdate(updatable, ['external_id'])
                    .updateEntity(false)
                    .execute();
    }



    private async syncTraits(manager: EntityManager, leaders: LeaderUpsertInput[]): Promise<void> {
        const saved = await manager.find(LeaderEntity, {
            select: { id: true, externalId: true },
            where : { externalId: In(leaders.map((leader) => leader.externalId)) }
        });

        const idByExternalId = new Map<string, number>(saved.map((leader) => [leader.externalId, leader.id]));
        const rows = leaders.flatMap((leader) =>
            [...new Set(leader.traitIds)].map((traitId) => ({
                leader_id: idByExternalId.get(leader.externalId),
                trait_id : traitId
            }))
        );

        await manager.createQueryBuilder()
            .delete()
            .from('leader_trait')
            .where('leader_id IN (:...leaderIds)', { leaderIds: [...idByExternalId.values()] })
            .execute();

        if(rows.length)
            await manager.createQueryBuilder().insert().into('leader_trait').values(rows).execute();
    }   
    
}