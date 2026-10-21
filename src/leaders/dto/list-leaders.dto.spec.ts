import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListLeadersDto } from './list-leaders.dto';

const build = (plain: Record<string, unknown>) => plainToInstance(ListLeadersDto, plain);

describe('ListLeadersDto', () => {

  describe('color', () => {

    it('rechaza más de 50 caracteres', async () => {
      const errors = await validate(build({ color: 'GREEN'.repeat(21) }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({ maxLength: 'color debe tener como máximo 50 caracteres' });

    });

  });

  describe('page', () => {

    it('por defecto es 1', async () => {
      const dto = build({});

      expect(dto.page).toBe(1);
      expect(await validate(dto)).toHaveLength(0);

    });

    it.each([0,-1])('rechaza %s',  async(input) => {
        const errors = await validate(build({page: input}));
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints).toEqual({ min: 'page debe ser mayor o igual a 1' });
    });

  });

});