import { Global, Inject, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [{
    provide    : REDIS_CLIENT,
    inject     : [ConfigService],
    useFactory : (config: ConfigService) => {
      const logger = new Logger('Redis');
      const client = new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379'), { maxRetriesPerRequest: 1, enableOfflineQueue: false });

      client.on('error', (error) => logger.error(`Error de conexión: ${error.message}`));

      return client;

    },
  }],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis)
  {}



  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => this.redis.disconnect());

  }

}
