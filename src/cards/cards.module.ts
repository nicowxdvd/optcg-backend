import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardSetEntity } from './entities/card-set.entity';
import { TraitEntity } from './entities/trait.entity';
import { CardEntity } from './entities/card.entity';
import { LeaderEntity } from './entities/leader.entity';

@Module({
  imports : [TypeOrmModule.forFeature([CardSetEntity, TraitEntity, CardEntity, LeaderEntity])],
})
export class CardsModule {}
