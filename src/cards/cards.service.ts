import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { GithubRepoFile } from './interfaces/github-repo-file.interfaces';
import { CARD_SET_REPOSITORY, type CardSetRepositoryPort } from './ports/card-set.repository.port';


@Injectable()
export class CardsService {
    private readonly logger               = new Logger(CardsService.name);
    private readonly REPO_FILES_URL  = 'https://api.github.com/repos/apitcg/one-piece-tcg-data/contents/cards/en'

    constructor(
        private readonly httpService: HttpService,
        @Inject(CARD_SET_REPOSITORY) private readonly cardSets: CardSetRepositoryPort,
    ) {}



    private async fetchRepoFiles(): Promise<GithubRepoFile[]>{
        try {
            this.logger.log(`Consultando Archivos En repo: ${this.REPO_FILES_URL}`);

            const response = await firstValueFrom(this.httpService.get<GithubRepoFile[]>(this.REPO_FILES_URL));
            const files    = response.data.filter((file) => file.type === 'file' && file.name?.endsWith('.json')); 

            this.logger.log(`Se obtuvieron ${files.length} elementos desde GitHub.`);

            return files;
        } catch (error) {
            this.logger.error('Error al consumir los archivos', error instanceof Error ? error.stack : String(error));
            throw new InternalServerErrorException('No se pudo obtener los archivos de cartas desde la fuente externa.');
        }

    }



    async syncCards() {

    }



}
