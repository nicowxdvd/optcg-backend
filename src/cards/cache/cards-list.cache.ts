import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaginatedCardsDto } from "../dto/paginated-cards.dto";
import { ListCardsDto } from "../dto/list-cards.dto";

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

    }



    async set(query: ListCardsDto, value: PaginatedCardsDto): Promise<void> {

    }



    async invalidate() :Promise<void> {}


    private async buildKey(query: ListCardsDto): Promise<string> {}
}