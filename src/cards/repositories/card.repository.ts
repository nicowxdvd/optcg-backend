import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { CardEntity } from './entities/card.entity';
import { CardRepositoryPort } from '../ports/card.repository.port';
import { CardUpsertInput } from '../interfaces/card-upsert-input.interface';



@Injectable()
export class CardRepository implements CardRepositoryPort{



    constructor(
        @InjectRepository(CardEntity)
        private readonly repository: Repository<CardEntity>
    ){}



    async upsertMany(cards: CardUpsertInput[]): Promise<void> {
        if(!cards.length)
            return;

        await this.repository.manager.transaction(async (manager) => {
            await this.upsertCards(manager, cards);
            await this.syncTraits(manager, cards);
        });
    }



    private async upsertCards(manager: EntityManager, cards: CardUpsertInput[]): Promise<void> {
        await manager.getRepository(CardEntity).upsert(
            cards.map(({ setId, ...card }) => ({ ...card, set: { id: setId } })), ['externalId']
        );
    }



    private async syncTraits(manager: EntityManager, cards: CardUpsertInput[]): Promise<void> {
        const saved = await manager.find(CardEntity, {
            select: { id: true, externalId: true },
            where : { externalId: In(cards.map((card) => card.externalId)) }
        });

        const idByExternalId = new Map<string, number>(saved.map((card) => [card.externalId, card.id]));
        const rows = cards.flatMap((card) =>
            [...new Set(card.traitIds)].map((traitId) => ({
                card_id : idByExternalId.get(card.externalId),
                trait_id: traitId
            }))
        );

        await manager.createQueryBuilder()
            .delete()
            .from('card_trait')
            .where('card_id IN (:...cardIds)', { cardIds: [...idByExternalId.values()] })
            .execute();

        if(rows.length)
            await manager.createQueryBuilder().insert().into('card_trait').values(rows).execute();
    }

}