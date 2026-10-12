import { Column, CreateDateColumn, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CardSetEntity } from './card-set.entity';
import { TraitEntity } from './trait.entity';

@Entity('leaders')
export class LeaderEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({name: 'external_id', type: 'varchar',length: 50 ,unique: true})
    externalId!: string;

    @Index()
    @Column({name: 'card_code', type: 'varchar',length: 20})
    cardCode!: string;

    @Column({ type: 'varchar',length: 100})
    name!: string;

    @Column({ type: 'varchar', length: 20 })
    rarity!: string;

    @Column({ type: 'varchar', length: 50 })
    color!: string;

    @Column({ type: 'int', nullable: false })
    life!: number;

    @Column({ type: 'int', nullable: false })
    power!: number;

    @Column({ type: 'varchar', length: 30, nullable: true })
    attribute!: string | null;

    @Column({ type: 'text', nullable: true })
    effect!: string | null;

    @Column({ name: 'image_url', type: 'varchar', length: 255 })
    imageUrl!: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

    @ManyToOne(() => CardSetEntity, { nullable: false })
    @JoinColumn({ name: 'set_id' })
    set!: CardSetEntity;

    @ManyToMany(() => TraitEntity)
    @JoinTable({
        name              : 'leader_trait',
        joinColumn        : { name: 'leader_id',  referencedColumnName: 'id' },
        inverseJoinColumn : { name: 'trait_id', referencedColumnName: 'id' }
    })
    traits!: TraitEntity[];
}