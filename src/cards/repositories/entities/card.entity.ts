import { CardType } from '../../enums/card-type.enum';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('cards')
export class CardEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({name: 'external_id', type: 'varchar',length: 50 ,unique: true})
    externalId!: string;

    @Index()
    @Column({name: 'card_code', type: 'varchar',length: 20})
    cardCode!: string;

    @Column({ type: 'varchar',length: 100})
    name!: string;

    @Column({ type: 'varchar',length: 100 })
    type!: CardType;

    @Column({ type: 'varchar', length: 20 })
    rarity!: string;

    @Column({ type: 'varchar', length: 50 })
    color!: string;

    @Column({ type: 'int', nullable: true })
    cost!: number | null;

    @Column({ type: 'int', nullable: true })
    power!: number | null;

    @Column({ name: 'counter_value', type: 'int', nullable: true })
    counterValue!: number | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    attribute!: string | null;

    @Column({ type: 'text', nullable: true })
    effect!: string | null;

    @Column({ name: 'trigger_effect', type: 'text', nullable: true })
    triggerEffect!: string | null;

    @Column({ name: 'image_url', type: 'varchar', length: 255 })
    imageUrl!: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}