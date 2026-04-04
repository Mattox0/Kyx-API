import { MigrationInterface, QueryRunner } from "typeorm";

export class ModeTranslations1775400000000 implements MigrationInterface {
    name = 'ModeTranslations1775400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create mode-translation table
        await queryRunner.query(`CREATE TABLE "mode-translation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "locale" character varying(10) NOT NULL, "name" character varying(255) NOT NULL, "description" text NOT NULL, "modeId" uuid, CONSTRAINT "UQ_mode_translation_mode_locale" UNIQUE ("modeId", "locale"), CONSTRAINT "PK_mode_translation" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_mode_translation_mode_locale" ON "mode-translation" ("modeId", "locale")`);
        await queryRunner.query(`ALTER TABLE "mode-translation" ADD CONSTRAINT "FK_mode_translation_mode" FOREIGN KEY ("modeId") REFERENCES "mode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // 2. Migrate existing name/description to translation table with locale = 'fr'
        await queryRunner.query(`INSERT INTO "mode-translation" ("id", "modeId", "locale", "name", "description") SELECT uuid_generate_v4(), "id", 'fr', "name", COALESCE("description", '') FROM "mode"`);

        // 3. Drop name and description columns from mode
        await queryRunner.query(`ALTER TABLE "mode" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "mode" DROP COLUMN "description"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Re-add name and description columns as nullable
        await queryRunner.query(`ALTER TABLE "mode" ADD "name" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "mode" ADD "description" character varying(255)`);

        // 2. Restore data from translation table
        await queryRunner.query(`UPDATE "mode" m SET "name" = t."name", "description" = t."description" FROM "mode-translation" t WHERE t."modeId" = m."id" AND t."locale" = 'fr'`);

        // 3. Make columns NOT NULL
        await queryRunner.query(`ALTER TABLE "mode" ALTER COLUMN "name" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "mode" ALTER COLUMN "description" SET NOT NULL`);

        // 4. Drop translation table
        await queryRunner.query(`ALTER TABLE "mode-translation" DROP CONSTRAINT "FK_mode_translation_mode"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_mode_translation_mode_locale"`);
        await queryRunner.query(`DROP TABLE "mode-translation"`);
    }
}
