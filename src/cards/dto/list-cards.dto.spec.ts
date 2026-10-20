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

});
