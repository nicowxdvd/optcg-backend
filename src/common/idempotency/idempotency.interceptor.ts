import { BadRequestException, CallHandler, ConflictException, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Redis } from 'ioredis';
import { Observable, catchError, from, map, mergeMap, throwError } from 'rxjs';
import { REDIS_CLIENT } from '../../redis/redis.constants';

const TTL_SECONDS = 86400;

interface IdempotencyEntry { state: 'in_progress' | 'done'; body?: unknown }

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis)
  {}

  

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http     = context.switchToHttp();
    const request  = http.getRequest<Request>();
    const header   = request.headers['x-idempotency-key'];

    if (typeof header !== 'string' || !header || header.length > 255)
      throw new BadRequestException('Header x-idempotency-key requerido (máximo 255 caracteres)');

    const key = `idempotency:${header}`;

    return from(this.redis.set(key, JSON.stringify({ state: 'in_progress' }), 'EX', TTL_SECONDS, 'NX')).pipe(mergeMap(lock => lock === 'OK' ? this.execute(key, next) : from(this.replay(key))));

  }



  private execute(key: string, next: CallHandler<unknown>): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => from(this.redis.del(key)).pipe(mergeMap(() => throwError(() => error)))),
      mergeMap(body => from(this.redis.set(key, JSON.stringify({ state: 'done', body }), 'EX', TTL_SECONDS)).pipe(map(() => body))),
    );
  }


  private async replay(key: string): Promise<unknown> {
    const raw   = await this.redis.get(key);
    const entry = raw ? (JSON.parse(raw) as IdempotencyEntry) : null;

    if (entry?.state !== 'done')
      throw new ConflictException('Request con esta x-idempotency-key en curso');

    return entry.body;

  }

}
