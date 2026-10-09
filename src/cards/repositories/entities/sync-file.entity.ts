import { SyncStatus } from '../../enums/sync-status.enum';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('sync_files')
export class SyncFileEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name:'file_name', type: 'varchar', length: 255, unique: true })
    fileName!: string;

    @Column({ name: 'sync_hash', type: 'char', length: 40, nullable: true })
    syncHash!: string | null;

    @Column({ type: 'varchar', length: 20,  default: SyncStatus.PENDING })
    status!: SyncStatus;

    @Column({name:'card_count',  type: 'int', nullable: true  })
    cardCount!: number | null;

    @Column({name:'last_synced_at',  type: 'datetime', nullable: true  })
    lastSyncedAt!: Date | null;

    @Column({ name: 'last_error' , type: 'text', nullable: true })
    lastError!: string  | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}