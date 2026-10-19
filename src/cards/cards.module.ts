import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardSetEntity } from './entities/card-set.entity';
import { TraitEntity } from './entities/trait.entity';
import { CardEntity } from './entities/card.entity';
import { LeaderEntity } from './entities/leader.entity';
import { CARDS_READ_REPOSITORY } from './ports/cards-read.repository.port';
import { CardsReadRepository } from './repositories/cards-read.repository';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';

@Module({
  imports : [TypeOrmModule.forFeature([CardSetEntity, TraitEntity, CardEntity, LeaderEntity])],
  controllers: [CardsController],
  providers: [CardsService, { provide: CARDS_READ_REPOSITORY, useClass: CardsReadRepository }],
})
export class CardsModule {}
