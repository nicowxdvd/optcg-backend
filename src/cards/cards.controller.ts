import { Controller, Post } from '@nestjs/common';
import { SyncCardsResponseDto } from './dto/sync-cards-response.dto';
import { CardsService } from './cards.service';

@Controller('cards')
export class CardsController {

    constructor(
        private readonly cardService : CardsService
    ){}


    @Post('sync')
    async syncCards() : Promise<SyncCardsResponseDto>{
        await this.cardService.syncCards();
        return {
            message: 'Cartas sincronizadas correctamente '
        }
    }




}
