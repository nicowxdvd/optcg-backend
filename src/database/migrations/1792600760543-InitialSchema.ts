import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1792600760543 implements MigrationInterface {
    name = 'InitialSchema1792600760543'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`card_sets\` (\`id\` int NOT NULL AUTO_INCREMENT, \`code\` varchar(50) NULL, \`name\` varchar(255) NOT NULL, \`release_date\` timestamp NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_551711913c0e89987d2e42d5cf\` (\`code\`), UNIQUE INDEX \`IDX_fb96c3b4cc7b9e094c71396077\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`traits\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(50) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_a3dd8b6abd0bc266b4dd0434f8\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`leaders\` (\`id\` int NOT NULL AUTO_INCREMENT, \`external_id\` varchar(50) NOT NULL, \`card_code\` varchar(20) NOT NULL, \`name\` varchar(100) NOT NULL, \`rarity\` varchar(20) NOT NULL, \`color\` varchar(50) NOT NULL, \`life\` int NOT NULL, \`power\` int NOT NULL, \`attribute\` varchar(30) NULL, \`effect\` text NULL, \`image_url\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`set_id\` int NOT NULL, INDEX \`IDX_490acf50ecbd4be6992eaa43d4\` (\`card_code\`), UNIQUE INDEX \`IDX_6a2ba5e7ce82fa01013a33a9e9\` (\`external_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`cards\` (\`id\` int NOT NULL AUTO_INCREMENT, \`external_id\` varchar(50) NOT NULL, \`card_code\` varchar(20) NOT NULL, \`name\` varchar(100) NOT NULL, \`type\` varchar(100) NOT NULL, \`rarity\` varchar(20) NOT NULL, \`color\` varchar(50) NOT NULL, \`cost\` int NULL, \`power\` int NULL, \`counter_value\` int NULL, \`attribute\` varchar(50) NULL, \`effect\` text NULL, \`trigger_effect\` text NULL, \`image_url\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`set_id\` int NOT NULL, INDEX \`IDX_9ff65f31c892a6f49739794b47\` (\`card_code\`), UNIQUE INDEX \`IDX_da6aacf64bf4c6bf2b36773a0d\` (\`external_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`sync_files\` (\`id\` int NOT NULL AUTO_INCREMENT, \`file_name\` varchar(255) NOT NULL, \`sync_hash\` char(40) NULL, \`status\` varchar(20) NOT NULL DEFAULT 'PENDING', \`card_count\` int NULL, \`last_synced_at\` datetime NULL, \`last_error\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_f60a79247934de416cbc5dc0dd\` (\`file_name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`leader_trait\` (\`leader_id\` int NOT NULL, \`trait_id\` int NOT NULL, INDEX \`IDX_a928894c0947e68c9237037d74\` (\`leader_id\`), INDEX \`IDX_bb42a0d276d41f2049aebb349c\` (\`trait_id\`), PRIMARY KEY (\`leader_id\`, \`trait_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`card_trait\` (\`card_id\` int NOT NULL, \`trait_id\` int NOT NULL, INDEX \`IDX_0863ad1fded5b9ddbb513902c8\` (\`card_id\`), INDEX \`IDX_cd930e42ab237d0cdeecb746f5\` (\`trait_id\`), PRIMARY KEY (\`card_id\`, \`trait_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`leaders\` ADD CONSTRAINT \`FK_0e87ed560ceb2e65b612626f617\` FOREIGN KEY (\`set_id\`) REFERENCES \`card_sets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`cards\` ADD CONSTRAINT \`FK_6abc6b5f69333e3fea772d35fd2\` FOREIGN KEY (\`set_id\`) REFERENCES \`card_sets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`leader_trait\` ADD CONSTRAINT \`FK_a928894c0947e68c9237037d745\` FOREIGN KEY (\`leader_id\`) REFERENCES \`leaders\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`leader_trait\` ADD CONSTRAINT \`FK_bb42a0d276d41f2049aebb349c1\` FOREIGN KEY (\`trait_id\`) REFERENCES \`traits\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`card_trait\` ADD CONSTRAINT \`FK_0863ad1fded5b9ddbb513902c85\` FOREIGN KEY (\`card_id\`) REFERENCES \`cards\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`card_trait\` ADD CONSTRAINT \`FK_cd930e42ab237d0cdeecb746f58\` FOREIGN KEY (\`trait_id\`) REFERENCES \`traits\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`card_trait\` DROP FOREIGN KEY \`FK_cd930e42ab237d0cdeecb746f58\``);
        await queryRunner.query(`ALTER TABLE \`card_trait\` DROP FOREIGN KEY \`FK_0863ad1fded5b9ddbb513902c85\``);
        await queryRunner.query(`ALTER TABLE \`leader_trait\` DROP FOREIGN KEY \`FK_bb42a0d276d41f2049aebb349c1\``);
        await queryRunner.query(`ALTER TABLE \`leader_trait\` DROP FOREIGN KEY \`FK_a928894c0947e68c9237037d745\``);
        await queryRunner.query(`ALTER TABLE \`cards\` DROP FOREIGN KEY \`FK_6abc6b5f69333e3fea772d35fd2\``);
        await queryRunner.query(`ALTER TABLE \`leaders\` DROP FOREIGN KEY \`FK_0e87ed560ceb2e65b612626f617\``);
        await queryRunner.query(`DROP INDEX \`IDX_cd930e42ab237d0cdeecb746f5\` ON \`card_trait\``);
        await queryRunner.query(`DROP INDEX \`IDX_0863ad1fded5b9ddbb513902c8\` ON \`card_trait\``);
        await queryRunner.query(`DROP TABLE \`card_trait\``);
        await queryRunner.query(`DROP INDEX \`IDX_bb42a0d276d41f2049aebb349c\` ON \`leader_trait\``);
        await queryRunner.query(`DROP INDEX \`IDX_a928894c0947e68c9237037d74\` ON \`leader_trait\``);
        await queryRunner.query(`DROP TABLE \`leader_trait\``);
        await queryRunner.query(`DROP INDEX \`IDX_f60a79247934de416cbc5dc0dd\` ON \`sync_files\``);
        await queryRunner.query(`DROP TABLE \`sync_files\``);
        await queryRunner.query(`DROP INDEX \`IDX_da6aacf64bf4c6bf2b36773a0d\` ON \`cards\``);
        await queryRunner.query(`DROP INDEX \`IDX_9ff65f31c892a6f49739794b47\` ON \`cards\``);
        await queryRunner.query(`DROP TABLE \`cards\``);
        await queryRunner.query(`DROP INDEX \`IDX_6a2ba5e7ce82fa01013a33a9e9\` ON \`leaders\``);
        await queryRunner.query(`DROP INDEX \`IDX_490acf50ecbd4be6992eaa43d4\` ON \`leaders\``);
        await queryRunner.query(`DROP TABLE \`leaders\``);
        await queryRunner.query(`DROP INDEX \`IDX_a3dd8b6abd0bc266b4dd0434f8\` ON \`traits\``);
        await queryRunner.query(`DROP TABLE \`traits\``);
        await queryRunner.query(`DROP INDEX \`IDX_fb96c3b4cc7b9e094c71396077\` ON \`card_sets\``);
        await queryRunner.query(`DROP INDEX \`IDX_551711913c0e89987d2e42d5cf\` ON \`card_sets\``);
        await queryRunner.query(`DROP TABLE \`card_sets\``);
    }

}
