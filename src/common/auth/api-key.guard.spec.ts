import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

const VALID_KEY = 'clave-de-prueba-0123456789abcdef';

const configWith = (key?: string): ConfigService => ({ get: jest.fn(() => key) }) as unknown as ConfigService;

const contextWith = (headers: Record<string, string>): ExecutionContext => ({
  switchToHttp: () => ({ getRequest: () => ({ header: (name: string) => headers[name.toLowerCase()] }) }),
}) as unknown as ExecutionContext;

describe('ApiKeyGuard', () => {

  let guard: ApiKeyGuard;

  beforeEach(() => {
    guard = new ApiKeyGuard(configWith(VALID_KEY));

  });



  describe('constructor', () => {

    it('lanza error si ADMIN_API_KEY no está configurada', () => {
      expect(() => new ApiKeyGuard(configWith(undefined))).toThrow('ADMIN_API_KEY no configurada');

    });



    it('lanza error si ADMIN_API_KEY está vacía', () => {
      expect(() => new ApiKeyGuard(configWith(''))).toThrow('ADMIN_API_KEY no configurada');

    });

  });



  describe('canActivate', () => {

    it('deja pasar con la key correcta', () => {
      expect(guard.canActivate(contextWith({ 'x-api-key': VALID_KEY }))).toBe(true);

    });



    it('lanza 401 con una key incorrecta del mismo largo', () => {
      const wrong = 'X'.repeat(VALID_KEY.length);

      expect(() => guard.canActivate(contextWith({ 'x-api-key': wrong }))).toThrow(UnauthorizedException);

    });



    it('lanza 401 con una key de largo distinto sin romper timingSafeEqual', () => {
      expect(() => guard.canActivate(contextWith({ 'x-api-key': 'corta' }))).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(contextWith({ 'x-api-key': VALID_KEY + 'extra' }))).toThrow(UnauthorizedException);

    });



    it('lanza 401 si el header está vacío', () => {
      expect(() => guard.canActivate(contextWith({ 'x-api-key': '' }))).toThrow(UnauthorizedException);

    });



    it('lanza 401 si el header falta', () => {
      expect(() => guard.canActivate(contextWith({}))).toThrow(UnauthorizedException);

    });

  });

});
