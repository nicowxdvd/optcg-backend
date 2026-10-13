import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncFileRepositoryPort } from '../ports/sync-files.repository.port';
import { SyncFileEntity } from './entities/sync-file.entity';
import { SyncStatus } from '../enums/sync-status.enum';

@Injectable()
export class SyncFileRepository implements SyncFileRepositoryPort{

    constructor(
        @InjectRepository(SyncFileEntity)
        private readonly repository: Repository<SyncFileEntity>
    ){}



    async findByFileName(fileName: string): Promise<SyncFileEntity | null> {
        return this.repository.findOneBy({fileName})
    }



    async markPending(fileName: string): Promise<void> {
        await this.repository.upsert({ fileName, status: SyncStatus.PENDING }, ['fileName'])
    }



    async markSynced(fileName: string, syncHash: string, cardCount: number): Promise<void> {
       await this.repository.upsert({fileName, syncHash: syncHash, cardCount: cardCount, status: SyncStatus.OK, lastSyncedAt: new Date(), lastError: null}, ['fileName'])
    }



    async markFailed(fileName: string, error: string): Promise<void> {
        await this.repository.upsert({fileName, status: SyncStatus.FAILED, lastError: error}, ['fileName'])
    }


}