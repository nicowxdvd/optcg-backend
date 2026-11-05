import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {

    private readonly expected: Buffer;

    constructor(config: ConfigService) {
        const key = config.get<string>('ADMIN_API_KEY');
        if (!key)
             throw new Error('ADMIN_API_KEY no configurada');

        this.expected = this.digest(key);
    }



    canActivate(context: ExecutionContext): boolean {
        const req      = context.switchToHttp().getRequest<Request>();
        const provided = req.header('x-api-key');

        if (!provided || !timingSafeEqual(this.digest(provided), this.expected)) {
            throw new UnauthorizedException();
        }
        return true;
    }



    private digest(value: string): Buffer {
        return createHash('sha256').update(value).digest();
    }

}