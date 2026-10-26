import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { StatusConsumer } from './status.consumer';

@Module({
  controllers: [UploadsController],
  providers  : [UploadsService, StatusConsumer],
})
export class UploadsModule {}