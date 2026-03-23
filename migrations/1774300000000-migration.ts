import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1774300000000 implements MigrationInterface {
    name = 'Migration1774300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "isPremium" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isPremium"`);
    }
}
