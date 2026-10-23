import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaginatedCardsDto } from "../dto/paginated-cards.dto";
import { ListCardsDto } from "../dto/list-cards.dto";
import { REDIS_CLIENT } from "../../redis/redis.constants";
import { Redis } from 'ioredis';
import { createHash } from 'crypto';

@Injectable()
export class CardsListCache {

    private readonly logger      = new Logger(CardsListCache.name);
    private readonly VERSION_KEY = 'cards:list:version';
    private readonly ttl: number;



    constructor(
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
        config: ConfigService
    ){
        this.ttl = config.get<number>('CARDS_CACHE_TTL_SECONDS', 3600);

    }



    async get(query: ListCardsDto): Promise<PaginatedCardsDto | null> {
        try {
            const key        = await this.buildKey(query);
            const cachedData = await this.redis.get(key);

            if (!cachedData) {
                return null;
            }
            
            return JSON.parse(cachedData) as PaginatedCardsDto;
        } catch (error) {
            this.logger.error(`No se pudo obtener la caché: ${error instanceof Error ? error.message : String(error)}`);
            return null;

        }
    }



    async set(query: ListCardsDto, value: PaginatedCardsDto): Promise<void> {

    }



    async invalidate() :Promise<void> {
        try {
            await this.redis.incr(this.VERSION_KEY);
        } catch (error) {
            this.logger.error(`No se pudo invalidar la caché: ${error instanceof Error ? error.message : String(error)}`);
        }
    }



    private async buildKey({ page, limit, name, code }: ListCardsDto): Promise<string> {
        const version = await this.redis.get(this.VERSION_KEY) ?? '0';
        const payload = JSON.stringify({ page, limit, name: name?.toLowerCase(), code });
        const hash    = createHash('sha256').update(payload).digest('hex');

        return `cards:list:v${version}:${hash}`;
    }
}