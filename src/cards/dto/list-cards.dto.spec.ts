import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListCardsDto } from './list-cards.dto';

const build = (plain: Record<string, unknown>) => plainToInstance(ListCardsDto, plain);

describe('ListCardsDto', () => {

  describe('code', () => {

    it.each([
      { input: 'OP01-001',   expected: 'OP01-001' },
      { input: 'op01-001',   expected: 'OP01-001' },
      { input: '  op01  ',   expected: 'OP01'     },
      { input: '',           expected: undefined  },
      { input: '   ',        expected: undefined  },
    ])('"$input" se normaliza a $expected', async ({ input, expected }) => {
      const dto = build({ code: input });

      expect(dto.code).toBe(expected);
      expect(await validate(dto)).toHaveLength(0);

    });


    it('es opcional', async () => {
      const dto = build({});

      expect(dto.code).toBeUndefined();
      expect(await validate(dto)).toHaveLength(0);

    });


    it('acepta 20 caracteres', async () => {
      expect(await validate(build({ code: 'A'.repeat(20) }))).toHaveLength(0);

    });


    it('rechaza más de 20 caracteres', async () => {
      const errors = await validate(build({ code: 'A'.repeat(21) }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({ maxLength: 'code debe tener como máximo 20 caracteres' });

    });


    it('rechaza valores que no son texto', async () => {
      const errors = await validate(build({ code: ['OP01', 'OP02'] }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isString', 'code debe ser un texto');

    });

  });

  describe('q', () => {

    it.each([
      { input: 'luffy',     expected: 'luffy'  },
      { input: '  Luffy  ', expected: 'Luffy'  },
      { input: 'op01-001',  expected: 'op01-001' },
      { input: '',          expected: undefined },
      { input: '   ',       expected: undefined },
    ])('"$input" se normaliza a $expected', async ({ input, expected }) => {
      const dto = build({ q: input });

      expect(dto.q).toBe(expected);
      expect(await validate(dto)).toHaveLength(0);

    });


    it('es opcional', async () => {
      const dto = build({});

      expect(dto.q).toBeUndefined();
      expect(await validate(dto)).toHaveLength(0);

    });


    it('acepta 100 caracteres', async () => {
      expect(await validate(build({ q: 'A'.repeat(100) }))).toHaveLength(0);

    });


    it('rechaza más de 100 caracteres', async () => {
      const errors = await validate(build({ q: 'A'.repeat(101) }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({ maxLength: 'q debe tener como máximo 100 caracteres' });

    });


    it('rechaza valores que no son texto', async () => {
      const errors = await validate(build({ q: ['luffy', 'zoro'] }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isString', 'q debe ser un texto');

    });

  });


  describe('trait', () => {

    it.each([
      { input: 'Straw Hat Crew',   expected: 'Straw Hat Crew' },
      { input: '  Supernovas  ',   expected: 'Supernovas'     },
      { input: '',                 expected: undefined        },
      { input: '   ',              expected: undefined        },
    ])('"$input" se normaliza a $expected', async ({ input, expected }) => {
      const dto = build({ trait: input });

      expect(dto.trait).toBe(expected);
      expect(await validate(dto)).toHaveLength(0);

    });


    it('es opcional', async () => {
      const dto = build({});

      expect(dto.trait).toBeUndefined();
      expect(await validate(dto)).toHaveLength(0);

    });


    it('acepta 50 caracteres', async () => {
      expect(await validate(build({ trait: 'A'.repeat(50) }))).toHaveLength(0);

    });


    it('rechaza más de 50 caracteres', async () => {
      const errors = await validate(build({ trait: 'A'.repeat(51) }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({ maxLength: 'trait debe tener como máximo 50 caracteres' });

    });


    it('rechaza valores que no son texto', async () => {
      const errors = await validate(build({ trait: ['Straw Hat Crew', 'Supernovas'] }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isString', 'trait debe ser un texto');

    });

  });

  describe.each(['cost', 'costMin', 'costMax'] as const)('%s', (field) => {

    it.each([
      { input: '3',  expected: 3         },
      { input: '0',  expected: 0         },
      { input: ' 7 ', expected: 7        },
      { input: 4,    expected: 4         },
      { input: '',   expected: undefined },
      { input: '  ', expected: undefined },
    ])('"$input" se normaliza a $expected', async ({ input, expected }) => {
      const dto = build({ [field]: input });

      expect(dto[field]).toBe(expected);
      expect(await validate(dto)).toHaveLength(0);

    });


    it('es opcional', async () => {
      const dto = build({});

      expect(dto[field]).toBeUndefined();
      expect(await validate(dto)).toHaveLength(0);

    });


    it.each(['abc', '1.5', 'NaN', '3abc', 2.5])('rechaza %p por no ser entero', async (input) => {
      const errors = await validate(build({ [field]: input }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isInt', `${field} debe ser un número entero`);

    });


    it('rechaza valores negativos', async () => {
      const errors = await validate(build({ [field]: '-1' }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('min', `${field} debe ser mayor o igual a 0`);

    });

  });


  describe('rango de coste', () => {

    it('acepta costMin igual a costMax', async () => {
      expect(await validate(build({ costMin: '3', costMax: '3' }))).toHaveLength(0);

    });


    it('acepta costMin menor que costMax', async () => {
      expect(await validate(build({ costMin: '2', costMax: '5' }))).toHaveLength(0);

    });


    it('acepta solo costMin o solo costMax', async () => {
      expect(await validate(build({ costMin: '2' }))).toHaveLength(0);
      expect(await validate(build({ costMax: '5' }))).toHaveLength(0);

    });


    it('rechaza costMin mayor que costMax', async () => {
      const errors = await validate(build({ costMin: '5', costMax: '2' }));

      expect(errors.length).toBeGreaterThan(0);

    });


    it('rechaza cost junto con costMin', async () => {
      const errors = await validate(build({ cost: '3', costMin: '1' }));

      expect(errors.length).toBeGreaterThan(0);

    });


    it('rechaza cost junto con costMax', async () => {
      const errors = await validate(build({ cost: '3', costMax: '5' }));

      expect(errors.length).toBeGreaterThan(0);

    });


    it('combina cost con page, limit, name y code', async () => {
      expect(await validate(build({ cost: '3', page: '2', limit: '10', name: 'izo', code: 'op01' }))).toHaveLength(0);

    });

  });

});
