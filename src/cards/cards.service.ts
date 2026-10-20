import { Inject, Injectable } from '@nestjs/common';
import { CARDS_READ_REPOSITORY, type CardsReadRepositoryPort } from './ports/cards-read.repository.port';
import { ListCardsDto } from './dto/list-cards.dto';
import { PaginatedCardsDto } from './dto/paginated-cards.dto';
import { toResponse } from './mappers/card.mapper';

@Injectable()
export class CardsService {

    constructor(
        @Inject(CARDS_READ_REPOSITORY) private readonly cardsRead: CardsReadRepositoryPort,
    ) {}

    async list({ page, limit, name }: ListCardsDto): Promise<PaginatedCardsDto> {
        const { items, total } = await this.cardsRead.findPage((page - 1) * limit, limit, name);

        return {
            items      : items.map(card => toResponse(card)),
            total,
            page,
            totalPages : Math.ceil(total / limit),
        };
    }

}
