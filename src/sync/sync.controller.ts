import { Controller, Post } from '@nestjs/common';
import { SyncCardsResponseDto } from './dto/sync-cards-response.dto';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {

    constructor(private readonly syncService: SyncService) {}


    @Post()
    async syncCards(): Promise<SyncCardsResponseDto> {
        await this.syncService.syncCards();

        return { message: 'Cartas sincronizadas correctamente ' };

    }

}
