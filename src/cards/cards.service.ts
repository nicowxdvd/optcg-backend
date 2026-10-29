import { Inject, Injectable } from '@nestjs/common';
import { CARDS_READ_REPOSITORY, type CardsReadRepositoryPort } from './ports/cards-read.repository.port';
import { ListCardsDto } from './dto/list-cards.dto';
import { PaginatedCardsDto } from './dto/paginated-cards.dto';
import { toResponse } from './mappers/card.mapper';
import { CardsListCache } from './cache/cards-list.cache';

@Injectable()
export class CardsService {

    constructor(
        @Inject(CARDS_READ_REPOSITORY) private readonly cardsRead: CardsReadRepositoryPort,
        private readonly cache: CardsListCache,
    ) {}

    

    async list(query: ListCardsDto): Promise<PaginatedCardsDto> {
        const cached = await this.cache.get(query);
        if (cached) {
            return cached;
        }

        const { page, limit, name, code, cost, costMin, costMax } = query;
        const { items, total } = await this.cardsRead.findPage((page - 1) * limit, limit, { name, code, cost, costMin, costMax });

        const result = {
            items      : items.map(card => toResponse(card)),
            total,
            page,
            totalPages : Math.ceil(total / limit),
        };

         await this.cache.set(query, result);
         return result;
    }

}
