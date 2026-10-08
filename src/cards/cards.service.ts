import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { RawGithubCard } from './interfaces/raw-github-card.interface';
import { firstValueFrom } from 'rxjs';
import { isLeaderCard, mapCardType, parseColor, parseTraits } from './mappers/card.mapper';

@Injectable()
export class CardsService {
    private readonly logger         = new Logger(CardsService.name);
    private readonly GITHUB_RAW_URL = 'https://raw.githubusercontent.com/apitcg/one-piece-tcg-data/main/data/cards.json';

    constructor(
        private readonly httpService: HttpService
    ) {}



    private async fetchRawCards(): Promise<RawGithubCard[]> {
        try {
            this.logger.log(`Consultando API externa: ${this.GITHUB_RAW_URL}`);

            const response = await firstValueFrom(this.httpService.get<RawGithubCard[]>(this.GITHUB_RAW_URL));
            if (!response.data || !Array.isArray(response.data))
                throw new Error('El formato de respuesta de GitHub no es un arreglo valido');

            this.logger.log(`Se obtuvieron ${response.data.length} elementos desde GitHub.`);

            return response.data;
        } catch (error) {
            this.logger.error('Error al consumir la API externa de cartas', error instanceof Error ? error.stack : String(error));
            throw new InternalServerErrorException('No se pudo obtener el catálogo de cartas desde la fuente externa.');
        }

    }



    async syncCards() {
        const rawCards = await this.fetchRawCards();

        const uniqueTraitNames = new Set<string>();
        for (const raw of rawCards) {
            const traits = parseTraits(raw.sub_type || raw.attribute_type);
            traits.forEach((t) => uniqueTraitNames.add(t));
        }
        const traitNamesList = Array.from(uniqueTraitNames);

        const rawLeaders     = rawCards.filter((raw) => isLeaderCard(raw));
        const mappedLeaders  = rawLeaders.map((raw) => ({
            cardCode   : raw.code || raw.card_code || '',
            name       : raw.name || raw.card_name || '',
            color      : parseColor(raw.color || raw.card_color),
            life       : raw.life ?? 5,
            power      : raw.power ?? 5000,
            attribute  : raw.attribute || null,
            effect     : raw.effect || raw.text || null,
            imageUrl   : raw.image_url || raw.src || null,
            traitNames : parseTraits(raw.sub_type || raw.attribute_type),
        }));

        const rawNonLeaders = rawCards.filter((raw) => !isLeaderCard(raw));
        const mappedCards   = rawNonLeaders.map((raw) => ({
            cardCode     : raw.code || raw.card_code || '',
            name         : raw.name || raw.card_name || '',
            type         : mapCardType(raw.category || raw.type || raw.card_type),
            color        : parseColor(raw.color || raw.card_color),
            cost         : raw.cost ?? 0,
            power        : raw.power ?? null,
            counterValue : raw.counter ?? raw.counter_value ?? 0,
            attribute    : raw.attribute || null,
            effect       : raw.effect || raw.text || null,
            imageUrl     : raw.image_url || raw.src || null,
            traitNames   : parseTraits(raw.sub_type || raw.attribute_type),
        }));

        this.logger.log(`Mapeo completado: ${traitNamesList.length} traits únicos, ${mappedLeaders.length} líderes y ${mappedCards.length} cartas.`,);

    }



}
