import { Controller, Post, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor';
import { ApiHeader } from '@nestjs/swagger';
import { SyncCardsResponseDto } from './dto/sync-cards-response.dto';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {

    constructor(
        private readonly syncService: SyncService
    ) {}


    @Post()
    @ApiHeader({ name: 'x-idempotency-key', required: true })
    @UseInterceptors(IdempotencyInterceptor)
    async syncCards(): Promise<SyncCardsResponseDto> {
        await this.syncService.syncCards();
        return { message: 'Cartas sincronizadas correctamente ' };

    }

}