import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('card_sets')
export class CardSetEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 50 , nullable: true, unique: true})
    code!: string | null;

    @Column({ type: 'varchar', length: 255, unique: true })
    name!: string;

    @Column({ name: 'release_date', type: 'timestamp', nullable: true })
    releaseDate!: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}