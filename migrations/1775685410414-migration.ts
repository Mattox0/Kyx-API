import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1775685410414 implements MigrationInterface {
    name = 'Migration1775685410414'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mode-translation" DROP CONSTRAINT "FK_mode_translation_mode"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_mode_translation_mode_locale"`);
        await queryRunner.query(`ALTER TABLE "mode-translation" DROP CONSTRAINT "UQ_mode_translation_mode_locale"`);
        await queryRunner.query(`CREATE TABLE "purity-translation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "locale" character varying(10) NOT NULL, "question" text NOT NULL, "purityId" uuid, CONSTRAINT "UQ_5e3245cd56de9e9b6320d527d56" UNIQUE ("purityId", "locale"), CONSTRAINT "PK_1f65677a08854252509a1ea5726" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5e3245cd56de9e9b6320d527d5" ON "purity-translation" ("purityId", "locale") `);
        await queryRunner.query(`CREATE TABLE "purity-answer-translation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "locale" character varying(10) NOT NULL, "text" text NOT NULL, "answerId" uuid, CONSTRAINT "UQ_412dda1b01bd02344fceb89c8ab" UNIQUE ("answerId", "locale"), CONSTRAINT "PK_10955a5d54e514292af8d3e6ff1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_412dda1b01bd02344fceb89c8a" ON "purity-answer-translation" ("answerId", "locale") `);
        await queryRunner.query(`CREATE TABLE "purity-answer" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "weight" integer NOT NULL DEFAULT '0', "position" integer NOT NULL DEFAULT '0', "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "purityId" uuid, CONSTRAINT "PK_0ef34dbf672d20d9b37d239d3a1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "purity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "position" integer NOT NULL DEFAULT '0', "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "modeId" uuid, CONSTRAINT "PK_92f9df95642170e37fb5c0927de" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e30d62e99163eeb27cac2e9d72" ON "mode-translation" ("modeId", "locale") `);
        await queryRunner.query(`ALTER TABLE "mode-translation" ADD CONSTRAINT "UQ_e30d62e99163eeb27cac2e9d721" UNIQUE ("modeId", "locale")`);
        await queryRunner.query(`ALTER TABLE "mode-translation" ADD CONSTRAINT "FK_3a24e1e2d573763ba9340130d36" FOREIGN KEY ("modeId") REFERENCES "mode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purity-translation" ADD CONSTRAINT "FK_c0c5cdf36260e590bebfc2146a3" FOREIGN KEY ("purityId") REFERENCES "purity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purity-answer-translation" ADD CONSTRAINT "FK_0205347418ddeb89e37ac5e5478" FOREIGN KEY ("answerId") REFERENCES "purity-answer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purity-answer" ADD CONSTRAINT "FK_b9d6df7f943c8e4d6d8536ea6c5" FOREIGN KEY ("purityId") REFERENCES "purity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purity" ADD CONSTRAINT "FK_a5d9cf9880a88b0a5d5d155aaf0" FOREIGN KEY ("modeId") REFERENCES "mode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purity" DROP CONSTRAINT "FK_a5d9cf9880a88b0a5d5d155aaf0"`);
        await queryRunner.query(`ALTER TABLE "purity-answer" DROP CONSTRAINT "FK_b9d6df7f943c8e4d6d8536ea6c5"`);
        await queryRunner.query(`ALTER TABLE "purity-answer-translation" DROP CONSTRAINT "FK_0205347418ddeb89e37ac5e5478"`);
        await queryRunner.query(`ALTER TABLE "purity-translation" DROP CONSTRAINT "FK_c0c5cdf36260e590bebfc2146a3"`);
        await queryRunner.query(`ALTER TABLE "mode-translation" DROP CONSTRAINT "FK_3a24e1e2d573763ba9340130d36"`);
        await queryRunner.query(`ALTER TABLE "mode-translation" DROP CONSTRAINT "UQ_e30d62e99163eeb27cac2e9d721"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e30d62e99163eeb27cac2e9d72"`);
        await queryRunner.query(`DROP TABLE "purity"`);
        await queryRunner.query(`DROP TABLE "purity-answer"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_412dda1b01bd02344fceb89c8a"`);
        await queryRunner.query(`DROP TABLE "purity-answer-translation"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e3245cd56de9e9b6320d527d5"`);
        await queryRunner.query(`DROP TABLE "purity-translation"`);
        await queryRunner.query(`ALTER TABLE "mode-translation" ADD CONSTRAINT "UQ_mode_translation_mode_locale" UNIQUE ("locale", "modeId")`);
        await queryRunner.query(`CREATE INDEX "IDX_mode_translation_mode_locale" ON "mode-translation" ("locale", "modeId") `);
        await queryRunner.query(`ALTER TABLE "mode-translation" ADD CONSTRAINT "FK_mode_translation_mode" FOREIGN KEY ("modeId") REFERENCES "mode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
