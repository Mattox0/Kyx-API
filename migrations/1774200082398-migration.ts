import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1774200082398 implements MigrationInterface {
    name = 'Migration1774200082398'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "suggestion" DROP COLUMN "resolved"`);
        await queryRunner.query(`ALTER TABLE "suggestion" ADD "status" character varying NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "suggestion" ADD "adminComment" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "suggestion" DROP COLUMN "adminComment"`);
        await queryRunner.query(`ALTER TABLE "suggestion" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "suggestion" ADD "resolved" boolean NOT NULL DEFAULT false`);
    }
}
