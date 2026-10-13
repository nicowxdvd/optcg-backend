import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { GithubRepoFile } from './interfaces/github-repo-file.interface';
import { CARD_SET_REPOSITORY, type CardSetRepositoryPort } from './ports/card-set.repository.port';
import { SYNC_FILE_REPOSITORY, type SyncFileRepositoryPort } from './ports/sync-files.repository.port';
import { SyncStatus } from './enums/sync-status.enum';
import { RawGithubCard } from './interfaces/raw-github-card.interface';
import { isLeaderCard, parseTraits } from './mappers/card.mapper';
import { LEADER_REPOSITORY, type LeaderRepositoryPort } from './ports/leader.repository.port';
import { CARD_REPOSITORY, type CardRepositoryPort } from './ports/card.repository.port';
import { TRAIT_REPOSITORY, type TraitRepositoryPort } from './ports/trait.repository.port';


@Injectable()
export class CardsService {
    private readonly logger          = new Logger(CardsService.name);
    private readonly REPO_FILES_URL  = 'https://api.github.com/repos/apitcg/one-piece-tcg-data/contents/cards/en'

    constructor(
        private readonly httpService: HttpService,
        @Inject(CARD_SET_REPOSITORY)  private readonly cardSets  : CardSetRepositoryPort,
        @Inject(SYNC_FILE_REPOSITORY) private readonly syncFiles : SyncFileRepositoryPort,
        @Inject(LEADER_REPOSITORY)    private readonly leaders   : LeaderRepositoryPort,  
        @Inject(CARD_REPOSITORY)      private readonly cards     : CardRepositoryPort,  
        @Inject(TRAIT_REPOSITORY)     private readonly traits    : TraitRepositoryPort 

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
        const files = await this.fetchRepoFiles();
        for( const file of files){
            const stored = await this.syncFiles.findByFileName(file.name!)
            if( stored?.status === SyncStatus.OK && stored.syncHash === file.sha )
                continue;

            await this.syncFile(file);

        }

    }


    private async syncFile(file:GithubRepoFile): Promise<void> {
        try {
            await this.syncFiles.markPending(file.name!);

            const raw   = await this.fetchFileCards(file);
            const setId = await this.cardSets.upsertByName(setName, setCode)

            const leaders = raw.filter(isLeaderCard);
            const cards   = raw.filter( (c)=> !isLeaderCard(c) );

            const traitNames    = [...new Set(raw.flatMap( (c) => parseTraits(c.sub_type))) ]
            const traits        = await this.traits.upsertByNames(traitNames);
            const traitIdByName = new Map(traits.map((t) => [t.name, t.id]));

            await this.leaders.upsertMany(leaders.map((r) => toLeaderInput(r, setId, traitIdByName)));
            await this.cards.upsertMany(cards.map((r) => toCardInput(r, setId, traitIdByName)));

            await this.syncFiles.markSynced(file.name!, file.sha!, raw.length)
            
        } catch (error) {
            await this.syncFiles.markFailed(file.name!, error instanceof Error ? error.message : String(error))
        }
    }



    private async fetchFileCards(file: GithubRepoFile): Promise<RawGithubCard[]> {
        const response = await firstValueFrom(this.httpService.get<RawGithubCard[]>(file.download_url!));
        return response.data;
    }



}
