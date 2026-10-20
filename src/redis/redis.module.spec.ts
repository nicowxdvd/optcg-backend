import { Redis } from 'ioredis';
import { RedisModule } from './redis.module';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

describe('RedisModule', () => {

  it('cierra la conexión con quit al destruir el módulo', async () => {
    const redis = { quit: jest.fn().mockResolvedValue('OK'), disconnect: jest.fn() };

    await new RedisModule(redis as unknown as Redis).onModuleDestroy();

    expect(redis.quit).toHaveBeenCalledTimes(1);
    expect(redis.disconnect).not.toHaveBeenCalled();

  });



  it('fuerza disconnect si quit falla', async () => {
    const redis = { quit: jest.fn().mockRejectedValue(new Error('Connection is closed.')), disconnect: jest.fn() };

    await new RedisModule(redis as unknown as Redis).onModuleDestroy();

    expect(redis.disconnect).toHaveBeenCalledTimes(1);

  });

});
