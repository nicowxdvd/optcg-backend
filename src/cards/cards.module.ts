import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { HttpModule } from '@nestjs/axios';
import { CardsService } from './cards.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardSetEntity } from './repositories/entities/card-set.entity';
import { CARD_SET_REPOSITORY } from './ports/card-set.repository.port';
import { CardSetRepository } from './repositories/card-set.repository';

@Module({
  imports     : [HttpModule, TypeOrmModule.forFeature([CardSetEntity])],
  controllers : [CardsController],
  providers   : [CardsService, { provide: CARD_SET_REPOSITORY, useClass: CardSetRepository }],
})
export class CardsModule {}
