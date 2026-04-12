import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1776001672255 implements MigrationInterface {
    name = 'Migration1776001672255'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "device_token" ADD "language" character varying(5) NOT NULL DEFAULT 'fr'`);
        await queryRunner.query(`ALTER TYPE "public"."game_gametype_enum" RENAME TO "game_gametype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."game_gametype_enum" AS ENUM('neverHave', 'prefer', 'truthDare', 'testPurity')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "gameType" TYPE "public"."game_gametype_enum" USING "gameType"::"text"::"public"."game_gametype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."game_gametype_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."game_gametype_enum_old" AS ENUM('neverHave', 'prefer', 'truthDare')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "gameType" TYPE "public"."game_gametype_enum_old" USING "gameType"::"text"::"public"."game_gametype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."game_gametype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."game_gametype_enum_old" RENAME TO "game_gametype_enum"`);
        await queryRunner.query(`ALTER TABLE "device_token" DROP COLUMN "language"`);
    }

}
