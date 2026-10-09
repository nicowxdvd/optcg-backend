import { SyncFileEntity } from "../repositories/entities/sync-file.entity";

export const SYNC_FILE_REPOSITORY = Symbol('SYNC_FILE_REPOSITORY');

export interface SyncFileRepositoryPort{
    findByFileName(fileName:string)                                 : Promise<SyncFileEntity | null>;
    markPending(fileName:string)                                    : Promise<void>;
    markSynced(fileName:string, syncHash:string,  cardCount:number) : Promise<void>;
    markFailed(fileName:string,  error:string)                      : Promise<void>;
}