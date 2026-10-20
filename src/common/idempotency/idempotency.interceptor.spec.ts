import { BadRequestException, ConflictException, ExecutionContext } from '@nestjs/common';
import { Redis } from 'ioredis';
import RedisMock from 'ioredis-mock';
import { Observable, Subject, firstValueFrom, lastValueFrom, of, throwError } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';

const KEY_PREFIX = 'idempotency:';

const contextWith = (headers: Record<string, unknown>): ExecutionContext => ({
  switchToHttp: () => ({ getRequest: () => ({ headers }), getResponse: () => ({}) }),
}) as unknown as ExecutionContext;

const handlerOf = (result: Observable<unknown>): { handle: jest.Mock<Observable<unknown>> } => ({ handle: jest.fn(() => result) });

describe('IdempotencyInterceptor', () => {

  let redis       : Redis;
  let interceptor : IdempotencyInterceptor;

  beforeEach(async () => {
    redis       = new RedisMock();
    interceptor = new IdempotencyInterceptor(redis);

    await redis.flushall();

  });


  afterEach(() => redis.disconnect());



  describe('header x-idempotency-key', () => {

    it('lanza 400 si falta', () => {
      const next = handlerOf(of({}));

      expect(() => interceptor.intercept(contextWith({}), next)).toThrow(BadRequestException);
      expect(next.handle).not.toHaveBeenCalled();

    });



    it('lanza 400 si está vacío', () => {
      expect(() => interceptor.intercept(contextWith({ 'x-idempotency-key': '' }), handlerOf(of({})))).toThrow(BadRequestException);

    });



    it('lanza 400 si pasa los 255 caracteres', () => {
      expect(() => interceptor.intercept(contextWith({ 'x-idempotency-key': 'a'.repeat(256) }), handlerOf(of({})))).toThrow(BadRequestException);

    });



    it('acepta exactamente 255 caracteres', async () => {
      const result = await lastValueFrom(interceptor.intercept(contextWith({ 'x-idempotency-key': 'a'.repeat(255) }), handlerOf(of({ ok: true }))));

      expect(result).toEqual({ ok: true });

    });

  });



  describe('primera ejecución', () => {

    it('ejecuta el handler y devuelve su body', async () => {
      const next   = handlerOf(of({ message: 'ok' }));
      const result = await lastValueFrom(interceptor.intercept(contextWith({ 'x-idempotency-key': 'abc' }), next));

      expect(result).toEqual({ message: 'ok' });
      expect(next.handle).toHaveBeenCalledTimes(1);

    });



    it('guarda el estado done con el body y un TTL de 24 horas', async () => {
      await lastValueFrom(interceptor.intercept(contextWith({ 'x-idempotency-key': 'abc' }), handlerOf(of({ message: 'ok' }))));

      const stored = JSON.parse(await redis.get(`${KEY_PREFIX}abc`) as string) as unknown;
      const ttl    = await redis.ttl(`${KEY_PREFIX}abc`);

      expect(stored).toEqual({ state: 'done', body: { message: 'ok' } });
      expect(ttl).toBeGreaterThan(86390);
      expect(ttl).toBeLessThanOrEqual(86400);

    });

  });



  describe('replay', () => {

    it('devuelve el body guardado sin ejecutar el handler otra vez', async () => {
      const context = contextWith({ 'x-idempotency-key': 'abc' });
      const first   = handlerOf(of({ message: 'ok' }));
      const second  = handlerOf(of({ message: 'otro' }));

      await lastValueFrom(interceptor.intercept(context, first));
      const replayed = await lastValueFrom(interceptor.intercept(context, second));

      expect(replayed).toEqual({ message: 'ok' });
      expect(second.handle).not.toHaveBeenCalled();

    });



    it('no mezcla keys distintas', async () => {
      const first  = handlerOf(of({ n: 1 }));
      const second = handlerOf(of({ n: 2 }));

      await lastValueFrom(interceptor.intercept(contextWith({ 'x-idempotency-key': 'uno' }), first));
      const result = await lastValueFrom(interceptor.intercept(contextWith({ 'x-idempotency-key': 'dos' }), second));

      expect(result).toEqual({ n: 2 });
      expect(second.handle).toHaveBeenCalledTimes(1);

    });

  });



  describe('request en curso', () => {

    it('lanza 409 si otro request con la misma key sigue ejecutándose', async () => {
      const context = contextWith({ 'x-idempotency-key': 'abc' });
      const pending = new Subject<unknown>();
      const first   = handlerOf(pending);
      const second  = handlerOf(of({}));
      const running = firstValueFrom(interceptor.intercept(context, first));

      await new Promise(resolve => setImmediate(resolve));

      await expect(lastValueFrom(interceptor.intercept(context, second))).rejects.toThrow(ConflictException);
      expect(second.handle).not.toHaveBeenCalled();

      pending.next({ message: 'ok' });
      pending.complete();

      await expect(running).resolves.toEqual({ message: 'ok' });

    });



    it('lanza 409 si la key expiró entre el lock y la lectura', async () => {
      const context = contextWith({ 'x-idempotency-key': 'abc' });

      await redis.set(`${KEY_PREFIX}abc`, JSON.stringify({ state: 'in_progress' }));
      jest.spyOn(redis, 'get').mockResolvedValueOnce(null);

      await expect(lastValueFrom(interceptor.intercept(context, handlerOf(of({}))))).rejects.toThrow(ConflictException);

    });

  });



  describe('handler que falla', () => {

    it('borra la key y relanza el error original', async () => {
      const error = new Error('falló el sync');
      const next  = handlerOf(throwError(() => error));

      await expect(lastValueFrom(interceptor.intercept(contextWith({ 'x-idempotency-key': 'abc' }), next))).rejects.toBe(error);
      expect(await redis.exists(`${KEY_PREFIX}abc`)).toBe(0);

    });



    it('permite reintentar con la misma key después del fallo', async () => {
      const context = contextWith({ 'x-idempotency-key': 'abc' });

      await expect(lastValueFrom(interceptor.intercept(context, handlerOf(throwError(() => new Error('falló')))))).rejects.toThrow('falló');

      const retry  = handlerOf(of({ message: 'ok' }));
      const result = await lastValueFrom(interceptor.intercept(context, retry));

      expect(result).toEqual({ message: 'ok' });
      expect(retry.handle).toHaveBeenCalledTimes(1);

    });

  });

});
