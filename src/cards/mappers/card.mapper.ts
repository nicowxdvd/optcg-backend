import { CardResponseDto } from '../dto/card-response.dto';
import { CardEntity } from '../entities/card.entity';

export function toResponse(card: CardEntity): CardResponseDto {
    return {
        externalId    : card.externalId,
        cardCode      : card.cardCode,
        name          : card.name,
        type          : card.type,
        rarity        : card.rarity,
        color         : card.color,
        cost          : card.cost,
        power         : card.power,
        counterValue  : card.counterValue,
        attribute     : card.attribute,
        effect        : card.effect,
        triggerEffect : card.triggerEffect,
        imageUrl      : card.imageUrl,
    };
}
