import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { HttpModule } from '@nestjs/axios';
import { CardsService } from './cards.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardSetEntity } from './repositories/entities/card-set.entity';
import { CARD_SET_REPOSITORY } from './ports/card-set.repository.port';
import { CardSetRepository } from './repositories/card-set.repository';
import { SyncFileEntity } from './repositories/entities/sync-file.entity';
import { SYNC_FILE_REPOSITORY } from './ports/sync-files.repository.port';
import { SyncFileRepository } from './repositories/sync-file.repository';
import { TraitEntity } from './repositories/entities/trait.entity';
import { TRAIT_REPOSITORY } from './ports/trait.repository.port';
import { TraitRepository } from './repositories/trait.repository';
import { CardEntity } from './repositories/entities/card.entity';
import { CARD_REPOSITORY } from './ports/card.repository.port';
import { CardRepository } from './repositories/card.repository';

@Module({
  imports     : [HttpModule, TypeOrmModule.forFeature([CardSetEntity, SyncFileEntity, TraitEntity, CardEntity])],
  controllers : [CardsController],
  providers   : [
    CardsService,
    { provide: CARD_SET_REPOSITORY,  useClass: CardSetRepository },
    { provide: SYNC_FILE_REPOSITORY, useClass: SyncFileRepository },
    { provide: TRAIT_REPOSITORY,     useClass: TraitRepository },
    { provide: CARD_REPOSITORY,      useClass: CardRepository },
  ],
})
export class CardsModule {}
