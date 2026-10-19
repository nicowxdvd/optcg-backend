import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { HttpModule } from '@nestjs/axios';
import { CardsService } from './cards.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardSetEntity } from './entities/card-set.entity';
import { SyncFileEntity } from './repositories/entities/sync-file.entity';
import { SYNC_FILE_REPOSITORY } from './ports/sync-files.repository.port';
import { SyncFileRepository } from './repositories/sync-file.repository';
import { TraitEntity } from './entities/trait.entity';
import { CardEntity } from './entities/card.entity';
import { LeaderEntity } from './entities/leader.entity';
import { UNIT_OF_WORK } from './ports/unit-of-work.port';
import { TypeOrmUnitOfWork } from './repositories/typeorm-unit-of-work';

@Module({
  imports     : [HttpModule, TypeOrmModule.forFeature([CardSetEntity, SyncFileEntity, TraitEntity, CardEntity, LeaderEntity])],
  controllers : [CardsController],
  providers   : [
    CardsService,
    { provide: SYNC_FILE_REPOSITORY, useClass: SyncFileRepository },
    { provide: UNIT_OF_WORK,         useClass: TypeOrmUnitOfWork },
  ],
})
export class CardsModule {}
