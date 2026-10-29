import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexCardsCost1793280451293 implements MigrationInterface {
    name = 'IndexCardsCost1793280451293'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX \`IDX_3386f89ad4e6e616d329220714\` ON \`cards\` (\`type\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_59aed638f110f5d00ff1aa0beb\` ON \`cards\` (\`color\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_c07bb2234661d1290bb9fe95d4\` ON \`cards\` (\`cost\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_c07bb2234661d1290bb9fe95d4\` ON \`cards\``);
        await queryRunner.query(`DROP INDEX \`IDX_59aed638f110f5d00ff1aa0beb\` ON \`cards\``);
        await queryRunner.query(`DROP INDEX \`IDX_3386f89ad4e6e616d329220714\` ON \`cards\``);
    }

}
