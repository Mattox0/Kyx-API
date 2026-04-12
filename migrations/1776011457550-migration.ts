import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1776011457550 implements MigrationInterface {
    name = 'Migration1776011457550'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "most-likely-to-translation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "locale" character varying(10) NOT NULL, "question" text NOT NULL, "mostLikelyToId" uuid, CONSTRAINT "UQ_bb4553cebd8837fdc94edd93d3a" UNIQUE ("mostLikelyToId", "locale"), CONSTRAINT "PK_2dfd2abd3e0948b528959b56e87" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bb4553cebd8837fdc94edd93d3" ON "most-likely-to-translation" ("mostLikelyToId", "locale") `);
        await queryRunner.query(`CREATE TYPE "public"."most-likely-to_mentionedusergender_enum" AS ENUM('MAN', 'FEMALE', 'ALL')`);
        await queryRunner.query(`CREATE TABLE "most-likely-to" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "mentionedUserGender" "public"."most-likely-to_mentionedusergender_enum", "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "modeId" uuid, CONSTRAINT "PK_d21ff8a166f5d780f0e362c66ba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TYPE "public"."mode_gametype_enum" RENAME TO "mode_gametype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."mode_gametype_enum" AS ENUM('neverHave', 'prefer', 'truthDare', 'testPurity', 'mostLikelyTo')`);
        await queryRunner.query(`ALTER TABLE "mode" ALTER COLUMN "gameType" TYPE "public"."mode_gametype_enum" USING "gameType"::"text"::"public"."mode_gametype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."mode_gametype_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."game_gametype_enum" RENAME TO "game_gametype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."game_gametype_enum" AS ENUM('neverHave', 'prefer', 'truthDare', 'testPurity', 'mostLikelyTo')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "gameType" TYPE "public"."game_gametype_enum" USING "gameType"::"text"::"public"."game_gametype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."game_gametype_enum_old"`);
        await queryRunner.query(`ALTER TABLE "most-likely-to-translation" ADD CONSTRAINT "FK_11bc30f091aae6e20ce8ba7c6b0" FOREIGN KEY ("mostLikelyToId") REFERENCES "most-likely-to"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "most-likely-to" ADD CONSTRAINT "FK_4d4cb5a593efcd0ee969daa9a0e" FOREIGN KEY ("modeId") REFERENCES "mode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "most-likely-to" DROP CONSTRAINT "FK_4d4cb5a593efcd0ee969daa9a0e"`);
        await queryRunner.query(`ALTER TABLE "most-likely-to-translation" DROP CONSTRAINT "FK_11bc30f091aae6e20ce8ba7c6b0"`);
        await queryRunner.query(`CREATE TYPE "public"."game_gametype_enum_old" AS ENUM('neverHave', 'prefer', 'truthDare')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "gameType" TYPE "public"."game_gametype_enum_old" USING "gameType"::"text"::"public"."game_gametype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."game_gametype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."game_gametype_enum_old" RENAME TO "game_gametype_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."mode_gametype_enum_old" AS ENUM('neverHave', 'prefer', 'truthDare', 'testPurity')`);
        await queryRunner.query(`ALTER TABLE "mode" ALTER COLUMN "gameType" TYPE "public"."mode_gametype_enum_old" USING "gameType"::"text"::"public"."mode_gametype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."mode_gametype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."mode_gametype_enum_old" RENAME TO "mode_gametype_enum"`);
        await queryRunner.query(`DROP TABLE "most-likely-to"`);
        await queryRunner.query(`DROP TYPE "public"."most-likely-to_mentionedusergender_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bb4553cebd8837fdc94edd93d3"`);
        await queryRunner.query(`DROP TABLE "most-likely-to-translation"`);
    }

}
