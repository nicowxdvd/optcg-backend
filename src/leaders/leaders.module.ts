import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderEntity } from '../cards/entities/leader.entity';
import { LEADERS_READ_REPOSITORY } from './ports/leaders-read.repository.port';
import { LeadersReadRepository } from './repositories/leaders-read.repository';
import { LeadersService } from './leaders.service';
import { LeadersController } from './leaders.controller';

@Module({
  imports : [TypeOrmModule.forFeature([LeaderEntity])],
  controllers: [LeadersController],
  providers: [LeadersService, { provide: LEADERS_READ_REPOSITORY, useClass: LeadersReadRepository }],
})
export class LeadersModule {}
