import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncFileRepositoryPort } from '../ports/sync-files.repository.port';
import { SyncFileEntity } from './entities/sync-file.entity';

@Injectable()
export class SyncFileRepository implements SyncFileRepositoryPort{

    constructor(
        @InjectRepository(SyncFileEntity)
        private readonly repository: Repository<SyncFileEntity>
    ){}



    async findByFileName(fileName: string): Promise<SyncFileEntity | null> {
        return this.repository.findOneBy({fileName})
    }



    markPending(fileName: string): Promise<void> {
        return this.repository.update{}
    }



    markSynced(fileName: string, syncHash: string, cardCount: number): Promise<void> {
        throw new Error('Method not implemented.');
    }



    markFailed(fileName: string, error: string): Promise<void> {
        throw new Error('Method not implemented.');
    }


}