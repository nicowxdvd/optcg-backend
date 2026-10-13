import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { GithubRepoFile } from './interfaces/github-repo-file.interface';
import { CARD_SET_REPOSITORY, type CardSetRepositoryPort } from './ports/card-set.repository.port';
import { SYNC_FILE_REPOSITORY, type SyncFileRepositoryPort } from './ports/sync-files.repository.port';
import { SyncStatus } from './enums/sync-status.enum';
import { RawGithubCard } from './interfaces/raw-github-card.interface';
import { isLeaderCard, parseSetCode, parseTraits, toCardInput, toLeaderInput } from './mappers/card.mapper';
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
        this.logger.log('Iniciando sincronización de cartas.');

        const files   = await this.fetchRepoFiles();
        let   skipped = 0;

        for( const file of files){
            const stored = await this.syncFiles.findByFileName(file.name!)
            if( stored?.status === SyncStatus.OK && stored.syncHash === file.sha ){
                this.logger.log(`Archivo ${file.name} sin cambios, se omite.`);
                skipped++;
                continue;
            }

            await this.syncFile(file);

        }

        this.logger.log(`Sincronización terminada: ${files.length} archivos, ${skipped} omitidos.`);

    }



    private async syncFile(file:GithubRepoFile): Promise<void> {
        try {
            this.logger.log(`Sincronizando archivo ${file.name}.`);
            await this.syncFiles.markPending(file.name!);

            const raw   = await this.fetchFileCards(file);
            if (!raw.length)
                throw new Error(`Archivo ${file.name} sin cartas`);

            const setName = raw[0].set?.name;
            if (!setName)
                throw new Error(`Archivo ${file.name} sin nombre de set`);

            const setCode = parseSetCode(setName);
            const setId   = await this.cardSets.upsertByName(setName, setCode);
            this.logger.log(`Set ${setName} (${setCode ?? 'sin código'}) guardado con id ${setId}.`);

            const leaders = raw.filter(isLeaderCard);
            const cards   = raw.filter( (c)=> !isLeaderCard(c) );

            const traitNames    = [...new Set(raw.flatMap( (c) => parseTraits(c.family))) ]
            const traits        = await this.traits.upsertByNames(traitNames);
            const traitIdByName = new Map(traits.map((t) => [t.name, t.id]));
            this.logger.log(`${traits.length} traits guardados para ${file.name}.`);

            await this.leaders.upsertMany(leaders.map((r) => toLeaderInput(r, setId, traitIdByName)));
            await this.cards.upsertMany(cards.map((r) => toCardInput(r, setId, traitIdByName)));
            this.logger.log(`${leaders.length} líderes y ${cards.length} cartas guardados para ${file.name}.`);

            await this.syncFiles.markSynced(file.name!, file.sha!, raw.length)
            this.logger.log(`Archivo ${file.name} sincronizado.`);

        } catch (error) {
            this.logger.error(`Falló la sincronización de ${file.name}`, error instanceof Error ? error.stack : String(error));
            await this.syncFiles.markFailed(file.name!, error instanceof Error ? error.message : String(error))
        }
    }



    private async fetchFileCards(file: GithubRepoFile): Promise<RawGithubCard[]> {
        this.logger.log(`Descargando ${file.name} desde ${file.download_url}`);

        const response = await firstValueFrom(this.httpService.get<RawGithubCard[]>(file.download_url!));
        this.logger.log(`Se descargaron ${response.data.length} cartas de ${file.name}.`);

        return response.data;
    }



}
