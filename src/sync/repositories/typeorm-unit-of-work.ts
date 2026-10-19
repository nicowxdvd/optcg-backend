import { Injectable } from "@nestjs/common";
import { TransactionalRepositories, UnitOfWorkPort } from "../ports/unit-of-work.port";
import { DataSource } from "typeorm";
import { CardSetRepository } from "./card-set.repository";
import { SyncFileRepository } from "./sync-file.repository";
import { TraitRepository } from "./trait.repository";
import { LeaderRepository } from "./leader.repository";
import { CardRepository } from "./card.repository";
import { CardSetEntity } from "../../cards/entities/card-set.entity";
import { SyncFileEntity } from "./entities/sync-file.entity";
import { TraitEntity } from "../../cards/entities/trait.entity";
import { LeaderEntity } from "../../cards/entities/leader.entity";
import { CardEntity } from "../../cards/entities/card.entity";

@Injectable()
export class TypeOrmUnitOfWork implements UnitOfWorkPort {

    constructor(private readonly dataSource: DataSource) {}

    run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T> {
        return this.dataSource.transaction((manager) => work({
            cardSets  : new CardSetRepository (manager.getRepository(CardSetEntity)),
            syncFiles : new SyncFileRepository(manager.getRepository(SyncFileEntity)),
            traits    : new TraitRepository   (manager.getRepository(TraitEntity)),
            leaders   : new LeaderRepository  (manager.getRepository(LeaderEntity)),
            cards     : new CardRepository    (manager.getRepository(CardEntity)),
        }));
    }
}