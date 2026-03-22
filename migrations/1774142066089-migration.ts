import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1774142066089 implements MigrationInterface {
    name = 'Migration1774142066089'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_9e371ab179e2fdf9d34d1d0a0b0"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "friendCode"`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_065d4d8f3b5adb4a08841eae3c8" UNIQUE ("name")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_065d4d8f3b5adb4a08841eae3c8"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "friendCode" character varying(6)`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_9e371ab179e2fdf9d34d1d0a0b0" UNIQUE ("friendCode")`);
    }

}
