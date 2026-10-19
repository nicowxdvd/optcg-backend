import { toResponse } from './card.mapper';
import { CardEntity } from '../entities/card.entity';
import { CardType } from '../enums/card-type.enum';

const makeCard = (overrides: Partial<CardEntity> = {}) => ({ id: 1, externalId: 'OP01-001', cardCode: 'OP01-001', name: 'Izo', type: CardType.CHARACTER, rarity: 'R', color: 'Red', cost: 5, power: 7000, counterValue: 1000, attribute: 'Ranged', effect: 'On Play', triggerEffect: 'Trigger', imageUrl: 'https://img/izo.png', createdAt: new Date(), updatedAt: new Date(), ...overrides }) as CardEntity;

describe('toResponse', () => {

  it('copia los campos públicos de la carta', () => {
    const result = toResponse(makeCard());

    expect(result).toEqual({ externalId: 'OP01-001', cardCode: 'OP01-001', name: 'Izo', type: CardType.CHARACTER, rarity: 'R', color: 'Red', cost: 5, power: 7000, counterValue: 1000, attribute: 'Ranged', effect: 'On Play', triggerEffect: 'Trigger', imageUrl: 'https://img/izo.png' });

  });


  it('no expone campos internos de la entity', () => {
    const result = toResponse(makeCard());

    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('updatedAt');
    expect(result).not.toHaveProperty('set');
    expect(result).not.toHaveProperty('traits');

  });


  it('conserva los valores null de los campos opcionales', () => {
    const result = toResponse(makeCard({ cost: null, power: null, counterValue: null, attribute: null, effect: null, triggerEffect: null }));

    expect(result).toMatchObject({ cost: null, power: null, counterValue: null, attribute: null, effect: null, triggerEffect: null });

  });

});
