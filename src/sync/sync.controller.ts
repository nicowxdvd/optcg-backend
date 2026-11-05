import { Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor';
import { ApiHeader, ApiSecurity } from '@nestjs/swagger';
import { SyncCardsResponseDto } from './dto/sync-cards-response.dto';
import { SyncService } from './sync.service';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from '../common/auth/api-key.guard';

@Controller('sync')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class SyncController {

    constructor(
        private readonly syncService: SyncService
    ) {}


    @Post()
    @ApiHeader({ name: 'x-idempotency-key', required: true })
    @Throttle({ default: { ttl: 60_000, limit: 2 } })
    @UseInterceptors(IdempotencyInterceptor)
    async syncCards(): Promise<SyncCardsResponseDto> {
        await this.syncService.syncCards();
        return { message: 'Cartas sincronizadas correctamente ' };

    }

}