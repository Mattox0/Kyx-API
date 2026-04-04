import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1775302142625 implements MigrationInterface {
    name = 'Migration1775302142625'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Drop old unique constraints
        await queryRunner.query(`ALTER TABLE "prefer" DROP CONSTRAINT "UQ_4406334cb70765ae353568349cb"`);
        await queryRunner.query(`ALTER TABLE "truth-dare" DROP CONSTRAINT "UQ_974610c925ae27c6552f991f309"`);
        await queryRunner.query(`ALTER TABLE "never-have" DROP CONSTRAINT "UQ_de2f54e4875ee04ed4b9688eb5a"`);

        // 2. Create translation tables
        await queryRunner.query(`CREATE TABLE "truth-dare-translation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "locale" character varying(10) NOT NULL, "question" text NOT NULL, "truthDareId" uuid, CONSTRAINT "UQ_d383ea0867095d11d3673f2e7b6" UNIQUE ("truthDareId", "locale"), CONSTRAINT "PK_b80ddf954484d58752681109e49" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d383ea0867095d11d3673f2e7b" ON "truth-dare-translation" ("truthDareId", "locale") `);
        await queryRunner.query(`CREATE TABLE "never-have-translation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "locale" character varying(10) NOT NULL, "question" text NOT NULL, "neverHaveId" uuid, CONSTRAINT "UQ_3713f9c0e0d976c0746175d91bd" UNIQUE ("neverHaveId", "locale"), CONSTRAINT "PK_a3d87b00333b502b1731823c8b2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3713f9c0e0d976c0746175d91b" ON "never-have-translation" ("neverHaveId", "locale") `);
        await queryRunner.query(`CREATE TABLE "prefer-translation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "locale" character varying(10) NOT NULL, "choiceOne" text NOT NULL, "choiceTwo" text NOT NULL, "preferId" uuid, CONSTRAINT "UQ_10bec05e031f4dc60097f9b5858" UNIQUE ("preferId", "locale"), CONSTRAINT "PK_aa4226010272c530546ede55a68" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_10bec05e031f4dc60097f9b585" ON "prefer-translation" ("preferId", "locale") `);

        // 3. Add foreign keys to translation tables
        await queryRunner.query(`ALTER TABLE "truth-dare-translation" ADD CONSTRAINT "FK_7015bbae444e2f53def23fa08c8" FOREIGN KEY ("truthDareId") REFERENCES "truth-dare"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "never-have-translation" ADD CONSTRAINT "FK_8b8ca666f7f9319d8a20b021393" FOREIGN KEY ("neverHaveId") REFERENCES "never-have"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "prefer-translation" ADD CONSTRAINT "FK_d92aaf67f06419887cb54cbeba8" FOREIGN KEY ("preferId") REFERENCES "prefer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // 4. Migrate existing data to translation tables with locale = 'fr'
        await queryRunner.query(`INSERT INTO "never-have-translation" ("id", "neverHaveId", "locale", "question") SELECT uuid_generate_v4(), "id", 'fr', "question" FROM "never-have"`);
        await queryRunner.query(`INSERT INTO "prefer-translation" ("id", "preferId", "locale", "choiceOne", "choiceTwo") SELECT uuid_generate_v4(), "id", 'fr', "choiceOne", "choiceTwo" FROM "prefer"`);
        await queryRunner.query(`INSERT INTO "truth-dare-translation" ("id", "truthDareId", "locale", "question") SELECT uuid_generate_v4(), "id", 'fr', "question" FROM "truth-dare"`);

        // 5. Drop old text columns from parent tables
        await queryRunner.query(`ALTER TABLE "truth-dare" DROP COLUMN "question"`);
        await queryRunner.query(`ALTER TABLE "never-have" DROP COLUMN "question"`);
        await queryRunner.query(`ALTER TABLE "prefer" DROP COLUMN "choiceOne"`);
        await queryRunner.query(`ALTER TABLE "prefer" DROP COLUMN "choiceTwo"`);

        // 6. Add locale column to user
        await queryRunner.query(`ALTER TABLE "user" ADD "locale" character varying(10) NOT NULL DEFAULT 'fr-FR'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Re-add columns as nullable first (can't add NOT NULL to populated table without DEFAULT)
        await queryRunner.query(`ALTER TABLE "never-have" ADD "question" character varying`);
        await queryRunner.query(`ALTER TABLE "truth-dare" ADD "question" character varying`);
        await queryRunner.query(`ALTER TABLE "prefer" ADD "choiceOne" character varying`);
        await queryRunner.query(`ALTER TABLE "prefer" ADD "choiceTwo" character varying`);

        // 2. Restore data from translation tables
        await queryRunner.query(`UPDATE "never-have" nh SET "question" = t."question" FROM "never-have-translation" t WHERE t."neverHaveId" = nh."id" AND t."locale" = 'fr'`);
        await queryRunner.query(`UPDATE "truth-dare" td SET "question" = t."question" FROM "truth-dare-translation" t WHERE t."truthDareId" = td."id" AND t."locale" = 'fr'`);
        await queryRunner.query(`UPDATE "prefer" p SET "choiceOne" = t."choiceOne", "choiceTwo" = t."choiceTwo" FROM "prefer-translation" t WHERE t."preferId" = p."id" AND t."locale" = 'fr'`);

        // 3. Make columns NOT NULL now that data is populated
        await queryRunner.query(`ALTER TABLE "never-have" ALTER COLUMN "question" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "truth-dare" ALTER COLUMN "question" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "prefer" ALTER COLUMN "choiceOne" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "prefer" ALTER COLUMN "choiceTwo" SET NOT NULL`);

        // 4. Drop foreign keys and translation tables
        await queryRunner.query(`ALTER TABLE "prefer-translation" DROP CONSTRAINT "FK_d92aaf67f06419887cb54cbeba8"`);
        await queryRunner.query(`ALTER TABLE "never-have-translation" DROP CONSTRAINT "FK_8b8ca666f7f9319d8a20b021393"`);
        await queryRunner.query(`ALTER TABLE "truth-dare-translation" DROP CONSTRAINT "FK_7015bbae444e2f53def23fa08c8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_10bec05e031f4dc60097f9b585"`);
        await queryRunner.query(`DROP TABLE "prefer-translation"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3713f9c0e0d976c0746175d91b"`);
        await queryRunner.query(`DROP TABLE "never-have-translation"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d383ea0867095d11d3673f2e7b"`);
        await queryRunner.query(`DROP TABLE "truth-dare-translation"`);

        // 5. Restore unique constraints
        await queryRunner.query(`ALTER TABLE "never-have" ADD CONSTRAINT "UQ_de2f54e4875ee04ed4b9688eb5a" UNIQUE ("question")`);
        await queryRunner.query(`ALTER TABLE "truth-dare" ADD CONSTRAINT "UQ_974610c925ae27c6552f991f309" UNIQUE ("question")`);
        await queryRunner.query(`ALTER TABLE "prefer" ADD CONSTRAINT "UQ_4406334cb70765ae353568349cb" UNIQUE ("choiceOne", "choiceTwo", "modeId")`);

        // 6. Drop locale column from user
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "locale"`);
    }

}
