import { toResponse } from './leader.mapper';
import { LeaderEntity } from '../../cards/entities/leader.entity';

const leader = {
  id: 1, externalId: 'OP01-001_p1', cardCode: 'OP01-001', name: 'Roronoa Zoro', rarity: 'L', color: 'Red', life: 5, power: 5000,
  attribute: 'Slash', effect: '[DON!! x1] Your Characters gain +1000 power.', imageUrl: 'https://img/OP01-001.png',
  set: { id: 1, name: 'Romance Dawn' }, traits: [{ id: 2, name: 'Straw Hat Crew' }, { id: 1, name: 'Supernovas' }],
} as unknown as LeaderEntity;

describe('toResponse', () => {

  it('mapea los campos y expone set como nombre', () => {
    expect(toResponse(leader)).toEqual({
      externalId: 'OP01-001_p1', cardCode: 'OP01-001', name: 'Roronoa Zoro', rarity: 'L', color: 'Red', life: 5, power: 5000,
      attribute: 'Slash', effect: '[DON!! x1] Your Characters gain +1000 power.', imageUrl: 'https://img/OP01-001.png',
      set: 'Romance Dawn', traits: ['Straw Hat Crew', 'Supernovas'],
    });

  });


  it('ordena los traits por nombre', () => {
    const unsorted = { ...leader, traits: [{ id: 1, name: 'Supernovas' }, { id: 2, name: 'Straw Hat Crew' }] } as unknown as LeaderEntity;

    expect(toResponse(unsorted).traits).toEqual(['Straw Hat Crew', 'Supernovas']);

  });


  it('no muta los traits de la entity', () => {
    const unsorted = { ...leader, traits: [{ id: 1, name: 'Supernovas' }, { id: 2, name: 'Straw Hat Crew' }] } as unknown as LeaderEntity;

    toResponse(unsorted);

    expect(unsorted.traits.map(trait => trait.name)).toEqual(['Supernovas', 'Straw Hat Crew']);

  });


  it('deja attribute y effect en null', () => {
    const nulls = { ...leader, attribute: null, effect: null } as unknown as LeaderEntity;

    expect(toResponse(nulls)).toMatchObject({ attribute: null, effect: null });

  });

});