import { LeaderEntity } from '../../cards/entities/leader.entity';
import { LeaderResponseDto } from '../dto/leader-response.dto';

export function toResponse(leader: LeaderEntity): LeaderResponseDto {
  return {
    externalId : leader.externalId,
    cardCode   : leader.cardCode,
    name       : leader.name,
    rarity     : leader.rarity,
    color      : leader.color,
    life       : leader.life,
    power      : leader.power,
    attribute  : leader.attribute,
    effect     : leader.effect,
    imageUrl   : leader.imageUrl,
    set        : leader.set.name,
    traits     : leader.traits.map(trait => trait.name).sort(),
  };

}