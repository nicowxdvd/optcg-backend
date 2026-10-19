import { Controller, Get, Query } from '@nestjs/common';
import { CardsService } from './cards.service';
import { ListCardsDto } from './dto/list-cards.dto';
import { ApiOkResponse } from '@nestjs/swagger';
import { PaginatedCardsDto } from './dto/paginated-cards.dto';

@Controller('cards')
export class CardsController {

    constructor(
        private readonly cardsService: CardsService
    ) {}


    @Get()
    @ApiOkResponse({ type : PaginatedCardsDto })
    list( @Query() query: ListCardsDto ): Promise<PaginatedCardsDto> {
        return this.cardsService.list(query)

    }

}
