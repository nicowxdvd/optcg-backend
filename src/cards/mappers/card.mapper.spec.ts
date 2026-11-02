import { toResponse } from './card.mapper';
import { CardEntity } from '../entities/card.entity';
import { CardSetEntity } from '../entities/card-set.entity';
import { TraitEntity } from '../entities/trait.entity';
import { CardType } from '../enums/card-type.enum';

const makeCard = (overrides: Partial<CardEntity> = {}) => ({ id: 1, externalId: 'OP01-001', cardCode: 'OP01-001', name: 'Izo', type: CardType.CHARACTER, rarity: 'R', color: 'Red', cost: 5, power: 7000, counterValue: 1000, attribute: 'Ranged', effect: 'On Play', triggerEffect: 'Trigger', imageUrl: 'https://img/izo.png', createdAt: new Date(), updatedAt: new Date(), traits: [], set: { code: 'OP01', name: 'Romance Dawn' }, ...overrides }) as CardEntity;

describe('toResponse', () => {

  it('copia los campos públicos de la carta', () => {
    const result = toResponse(makeCard());

    expect(result).toEqual({ externalId: 'OP01-001', cardCode: 'OP01-001', name: 'Izo', type: CardType.CHARACTER, rarity: 'R', color: 'Red', cost: 5, power: 7000, counterValue: 1000, attribute: 'Ranged', effect: 'On Play', triggerEffect: 'Trigger', imageUrl: 'https://img/izo.png', traits: [], set: 'OP01' });

  });


  it('no expone campos internos de la entity', () => {
    const result = toResponse(makeCard());

    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('updatedAt');

  });


  it('conserva los valores null de los campos opcionales', () => {
    const result = toResponse(makeCard({ cost: null, power: null, counterValue: null, attribute: null, effect: null, triggerEffect: null }));

    expect(result).toMatchObject({ cost: null, power: null, counterValue: null, attribute: null, effect: null, triggerEffect: null });

  });


  describe('traits', () => {

    it('ordena los nombres alfabéticamente', () => {
      const result = toResponse(makeCard({ traits: [{ name: 'Straw Hat Crew' }, { name: 'Animal' }, { name: 'Supernovas' }] as TraitEntity[] }));

      expect(result.traits).toEqual(['Animal', 'Straw Hat Crew', 'Supernovas']);

    });


    it('devuelve [] si la carta no tiene traits', () => {
      const result = toResponse(makeCard({ traits: [] }));

      expect(result.traits).toEqual([]);

    });


    it('no muta el orden de la entity', () => {
      const traits = [{ name: 'Straw Hat Crew' }, { name: 'Animal' }] as TraitEntity[];

      toResponse(makeCard({ traits }));

      expect(traits.map(trait => trait.name)).toEqual(['Straw Hat Crew', 'Animal']);

    });

  });


  describe('set', () => {

    it('usa el code si existe', () => {
      const result = toResponse(makeCard({ set: { code: 'OP01', name: 'Romance Dawn' } as CardSetEntity }));

      expect(result.set).toBe('OP01');

    });


    it('usa el name si el code es null', () => {
      const result = toResponse(makeCard({ set: { code: null, name: 'Promotion Cards' } as CardSetEntity }));

      expect(result.set).toBe('Promotion Cards');

    });

  });

});
