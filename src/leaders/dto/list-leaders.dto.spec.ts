import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListLeadersDto } from './list-leaders.dto';

const build = (plain: Record<string, unknown>) => plainToInstance(ListLeadersDto, plain);

describe('ListLeadersDto', () => {

  describe('page', () => {

    it('por defecto es 1', async () => {
      const dto = build({});

      expect(dto.page).toBe(1);
      expect(await validate(dto)).toHaveLength(0);

    });


    it.each([
      { input: '1',   expected: 1   },
      { input: '2',   expected: 2   },
      { input: '150', expected: 150 },
    ])('"$input" se convierte a $expected', async ({ input, expected }) => {
      const dto = build({ page: input });

      expect(dto.page).toBe(expected);
      expect(await validate(dto)).toHaveLength(0);

    });


    it.each([0, -1])('rechaza %s', async (input) => {
      const errors = await validate(build({ page: input }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({ min: 'page debe ser mayor o igual a 1' });

    });


    it('rechaza un número decimal', async () => {
      const errors = await validate(build({ page: '1.5' }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({ isInt: 'page debe ser un número entero' });

    });


    it('rechaza texto', async () => {
      const errors = await validate(build({ page: 'abc' }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isInt', 'page debe ser un número entero');

    });

  });


  describe('limit', () => {

    it('por defecto es 20', async () => {
      const dto = build({});

      expect(dto.limit).toBe(20);
      expect(await validate(dto)).toHaveLength(0);

    });


    it.each([
      { input: '1',   expected: 1   },
      { input: '20',  expected: 20  },
      { input: '500', expected: 500 },
    ])('"$input" se convierte a $expected', async ({ input, expected }) => {
      const dto = build({ limit: input });

      expect(dto.limit).toBe(expected);
      expect(await validate(dto)).toHaveLength(0);

    });


    it.each([0, -1])('rechaza %s', async (input) => {
      const errors = await validate(build({ limit: input }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({ min: 'limit debe ser mayor o igual a 1' });

    });


    it('rechaza más de 500', async () => {
      const errors = await validate(build({ limit: 501 }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({ max: 'limit debe ser menor o igual a 500' });

    });


    it('rechaza un número decimal', async () => {
      const errors = await validate(build({ limit: '1.5' }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({ isInt: 'limit debe ser un número entero' });

    });


    it('rechaza texto', async () => {
      const errors = await validate(build({ limit: 'abc' }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isInt', 'limit debe ser un número entero');

    });

  });


  describe('name', () => {

    it.each([
      { input: 'Luffy',     expected: 'Luffy' },
      { input: '  Luffy  ', expected: 'Luffy' },
      { input: '',          expected: undefined },
      { input: '   ',       expected: undefined },
    ])('"$input" se normaliza a $expected', async ({ input, expected }) => {
      const dto = build({ name: input });

      expect(dto.name).toBe(expected);
      expect(await validate(dto)).toHaveLength(0);

    });


    it('es opcional', async () => {
      const dto = build({});

      expect(dto.name).toBeUndefined();
      expect(await validate(dto)).toHaveLength(0);

    });


    it('acepta 100 caracteres', async () => {
      expect(await validate(build({ name: 'A'.repeat(100) }))).toHaveLength(0);

    });


    it('rechaza más de 100 caracteres', async () => {
      const errors = await validate(build({ name: 'A'.repeat(101) }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({ maxLength: 'name debe tener como máximo 100 caracteres' });

    });


    it('rechaza valores que no son texto', async () => {
      const errors = await validate(build({ name: ['Luffy', 'Zoro'] }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isString', 'name debe ser un texto');

    });

  });


  describe('code', () => {

    it.each([
      { input: 'OP01-001', expected: 'OP01-001' },
      { input: 'op01-001', expected: 'OP01-001' },
      { input: '  op01  ', expected: 'OP01' },
      { input: '',         expected: undefined },
      { input: '   ',      expected: undefined },
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


  describe('color', () => {

    it.each([
      { input: 'Red/Green',   expected: 'RED/GREEN' },
      { input: 'green',       expected: 'GREEN' },
      { input: '  purple  ', expected: 'PURPLE' },
      { input: '',            expected: undefined },
      { input: '   ',         expected: undefined },
    ])('"$input" se normaliza a $expected', async ({ input, expected }) => {
      const dto = build({ color: input });

      expect(dto.color).toBe(expected);
      expect(await validate(dto)).toHaveLength(0);

    });


    it('es opcional', async () => {
      const dto = build({});

      expect(dto.color).toBeUndefined();
      expect(await validate(dto)).toHaveLength(0);

    });


    it('acepta 50 caracteres', async () => {
      expect(await validate(build({ color: 'A'.repeat(50) }))).toHaveLength(0);

    });


    it('rechaza más de 50 caracteres', async () => {
      const errors = await validate(build({ color: 'GREEN'.repeat(21) }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({ maxLength: 'color debe tener como máximo 50 caracteres' });

    });


    it('rechaza valores que no son texto', async () => {
      const errors = await validate(build({ color: ['RED', 'GREEN'] }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isString', 'color debe ser un texto');

    });

  });

});
