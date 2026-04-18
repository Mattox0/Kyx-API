import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1776450140328 implements MigrationInterface {
    name = 'Migration1776450140328'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ten-but-translation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "locale" character varying(10) NOT NULL, "question" text NOT NULL, "tenButId" uuid, CONSTRAINT "UQ_7a5e6f5ebc4c223b3fa8596f6a3" UNIQUE ("tenButId", "locale"), CONSTRAINT "PK_69b78a298b55737a809b9557915" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7a5e6f5ebc4c223b3fa8596f6a" ON "ten-but-translation" ("tenButId", "locale") `);
        await queryRunner.query(`CREATE TYPE "public"."ten-but_mentionedusergender_enum" AS ENUM('MAN', 'FEMALE', 'ALL')`);
        await queryRunner.query(`CREATE TABLE "ten-but" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "score" integer NOT NULL, "mentionedUserGender" "public"."ten-but_mentionedusergender_enum", "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "modeId" uuid, CONSTRAINT "PK_b6118d5128c4cd709612620cda3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "report" ADD "mostLikelyToId" uuid`);
        await queryRunner.query(`ALTER TABLE "report" ADD "tenButId" uuid`);
        await queryRunner.query(`ALTER TYPE "public"."mode_gametype_enum" RENAME TO "mode_gametype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."mode_gametype_enum" AS ENUM('neverHave', 'prefer', 'truthDare', 'testPurity', 'mostLikelyTo', 'tenBut')`);
        await queryRunner.query(`ALTER TABLE "mode" ALTER COLUMN "gameType" TYPE "public"."mode_gametype_enum" USING "gameType"::"text"::"public"."mode_gametype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."mode_gametype_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."game_gametype_enum" RENAME TO "game_gametype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."game_gametype_enum" AS ENUM('neverHave', 'prefer', 'truthDare', 'testPurity', 'mostLikelyTo', 'tenBut')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "gameType" TYPE "public"."game_gametype_enum" USING "gameType"::"text"::"public"."game_gametype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."game_gametype_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ten-but-translation" ADD CONSTRAINT "FK_5a7ad5d4cdd37ea75c252650355" FOREIGN KEY ("tenButId") REFERENCES "ten-but"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ten-but" ADD CONSTRAINT "FK_1c03db27001159833381354d35a" FOREIGN KEY ("modeId") REFERENCES "mode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "report" ADD CONSTRAINT "FK_77c3a2352c6a98eb48b78f7aedc" FOREIGN KEY ("mostLikelyToId") REFERENCES "most-likely-to"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "report" ADD CONSTRAINT "FK_772c761e46a4c47bb65a59264d7" FOREIGN KEY ("tenButId") REFERENCES "ten-but"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "report" DROP CONSTRAINT "FK_772c761e46a4c47bb65a59264d7"`);
        await queryRunner.query(`ALTER TABLE "report" DROP CONSTRAINT "FK_77c3a2352c6a98eb48b78f7aedc"`);
        await queryRunner.query(`ALTER TABLE "ten-but" DROP CONSTRAINT "FK_1c03db27001159833381354d35a"`);
        await queryRunner.query(`ALTER TABLE "ten-but-translation" DROP CONSTRAINT "FK_5a7ad5d4cdd37ea75c252650355"`);
        await queryRunner.query(`CREATE TYPE "public"."game_gametype_enum_old" AS ENUM('neverHave', 'prefer', 'truthDare', 'testPurity', 'mostLikelyTo')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "gameType" TYPE "public"."game_gametype_enum_old" USING "gameType"::"text"::"public"."game_gametype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."game_gametype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."game_gametype_enum_old" RENAME TO "game_gametype_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."mode_gametype_enum_old" AS ENUM('neverHave', 'prefer', 'truthDare', 'testPurity', 'mostLikelyTo')`);
        await queryRunner.query(`ALTER TABLE "mode" ALTER COLUMN "gameType" TYPE "public"."mode_gametype_enum_old" USING "gameType"::"text"::"public"."mode_gametype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."mode_gametype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."mode_gametype_enum_old" RENAME TO "mode_gametype_enum"`);
        await queryRunner.query(`ALTER TABLE "report" DROP COLUMN "tenButId"`);
        await queryRunner.query(`ALTER TABLE "report" DROP COLUMN "mostLikelyToId"`);
        await queryRunner.query(`DROP TABLE "ten-but"`);
        await queryRunner.query(`DROP TYPE "public"."ten-but_mentionedusergender_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7a5e6f5ebc4c223b3fa8596f6a"`);
        await queryRunner.query(`DROP TABLE "ten-but-translation"`);
    }

}
