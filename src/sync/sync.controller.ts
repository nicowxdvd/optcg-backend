import { Controller, Post } from '@nestjs/common';
import { SyncCardsResponseDto } from './dto/sync-cards-response.dto';
import { SyncService } from './sync.service';

@Controller('cards')
export class SyncController {

    constructor(private readonly syncService: SyncService) {}


    @Post('sync')
    async syncCards(): Promise<SyncCardsResponseDto> {
        await this.syncService.syncCards();

        return { message: 'Cartas sincronizadas correctamente ' };

    }

}
