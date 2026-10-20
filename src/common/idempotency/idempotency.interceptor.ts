import { BadRequestException, CallHandler, ConflictException, ExecutionContext, Inject, Injectable, NestInterceptor, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { Observable, catchError, from, map, mergeMap, throwError } from 'rxjs';
import { REDIS_CLIENT } from '../../redis/redis.constants';

interface IdempotencyEntry {
  state       : 'in_progress' | 'done';
  fingerprint : string;
  statusCode? : number;
  body?       : unknown;

}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}


  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http     = context.switchToHttp();
    const request  = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const header   = request.headers['x-idempotency-key'];

    if (typeof header !== 'string' || !header || header.length > 255)
      throw new BadRequestException('Header x-idempotency-key requerido (máximo 255 caracteres)');

    const key         = `idempotency:sync:${header}`;
    const fingerprint = createHash('sha256').update(`${request.method}${request.path}${JSON.stringify(request.body ?? {})}`).digest('hex');

    return from(this.acquireLock(key, fingerprint)).pipe(mergeMap(acquired => acquired ? this.execute(key, fingerprint, response, next) : from(this.replay(key, fingerprint, response))));

  }


  private execute(key: string, fingerprint: string, response: Response, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => from(this.redis.del(key).catch(() => null)).pipe(mergeMap(() => throwError(() => error)))),
      mergeMap((body: unknown) => from(this.store(key, fingerprint, response.statusCode, body)).pipe(map(() => body))),
    );

  }


  private async acquireLock(key: string, fingerprint: string): Promise<boolean> {
    const ttl    = Number(this.config.get('IDEMPOTENCY_LOCK_TTL_SECONDS', 900));
    const result = await this.guard(() => this.redis.set(key, JSON.stringify({ state: 'in_progress', fingerprint }), 'EX', ttl, 'NX'));

    return result === 'OK';

  }


  private async replay(key: string, fingerprint: string, response: Response): Promise<unknown> {
    const raw = await this.guard(() => this.redis.get(key));

    if (!raw)
      throw new ConflictException('La operación terminó o expiró justo ahora, reintentá');

    const entry = JSON.parse(raw) as IdempotencyEntry;

    if (entry.fingerprint !== fingerprint)
      throw new UnprocessableEntityException('La x-idempotency-key ya se usó con otro request');
    if (entry.state === 'in_progress')
      throw new ConflictException('Request con esta x-idempotency-key en curso');

    response.status(entry.statusCode ?? 200);
    response.setHeader('idempotent-replayed', 'true');

    return entry.body;

  }


  private async store(key: string, fingerprint: string, statusCode: number, body: unknown): Promise<void> {
    const ttl = Number(this.config.get('IDEMPOTENCY_TTL_SECONDS', 86400));

    await this.guard(() => this.redis.set(key, JSON.stringify({ state: 'done', fingerprint, statusCode, body }), 'EX', ttl));

  }


  private async guard<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();

    } catch {
      throw new ServiceUnavailableException('Redis no disponible');

    }

  }

}
