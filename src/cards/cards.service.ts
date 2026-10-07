import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { RawGithubCard } from './interfaces/raw-github-card.interface';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CardsService {
    private readonly logger         = new Logger(CardsService.name);
    private readonly GITHUB_RAW_URL = 'https://raw.githubusercontent.com/apitcg/one-piece-tcg-data/main/data/cards.json';

    constructor(
        private readonly httpService: HttpService
    ) {}


    private async fetchRawCards(): Promise<RawGithubCard[]> {
        try{
            this.logger.log(`Consultando API externa: ${this.GITHUB_RAW_URL}`);
            
            const response = await firstValueFrom( this.httpService.get<RawGithubCard[]>(this.GITHUB_RAW_URL));
            if(!response.data || !Array.isArray(response.data)){
                throw new Error ('El formato de respuesta de GitHub no es un arreglo valido')
            }

            this.logger.log(`Se obtuvieron ${response.data.length} elementos desde GitHub.`);
            return response.data;

        }catch(error){
            this.logger.error('Error al consumir la API externa de cartas', error instanceof Error ? error.stack : String(error));
            throw new InternalServerErrorException('No se pudo obtener el catálogo de cartas desde la fuente externa.', );
        }
    }


    async syncCards(){
        await this.fetchRawCards();
    }
}
