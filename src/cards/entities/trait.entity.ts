import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('traits')
export class TraitEntity{
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 50 , unique: true})
    name!: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}