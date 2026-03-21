import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1774088213828 implements MigrationInterface {
    name = 'Migration1774088213828'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "coins" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "coins"`);
    }

}
