import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1777216664424 implements MigrationInterface {
    name = 'Migration1777216664424'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "quizz-question-translation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "locale" character varying(10) NOT NULL, "text" text NOT NULL, "quizzQuestionId" uuid, CONSTRAINT "UQ_786ebc857c545df8bffbc5faff2" UNIQUE ("quizzQuestionId", "locale"), CONSTRAINT "PK_cc76fa45947ee54e933a770bb45" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_786ebc857c545df8bffbc5faff" ON "quizz-question-translation" ("quizzQuestionId", "locale") `);
        await queryRunner.query(`CREATE TABLE "quizz-answer-translation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "locale" character varying(10) NOT NULL, "text" text NOT NULL, "quizzAnswerId" uuid, CONSTRAINT "UQ_a9e901c5e40eb11e29a0932038e" UNIQUE ("quizzAnswerId", "locale"), CONSTRAINT "PK_19f9be4f0b2afc38370b119d7ec" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a9e901c5e40eb11e29a0932038" ON "quizz-answer-translation" ("quizzAnswerId", "locale") `);
        await queryRunner.query(`CREATE TABLE "quizz-answer" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isCorrect" boolean NOT NULL DEFAULT false, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "quizzQuestionId" uuid, CONSTRAINT "PK_a6e6f89dfd3f1ecfc7d96cfc0b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."quizz-question_difficulty_enum" AS ENUM('EASY', 'MEDIUM', 'HARD')`);
        await queryRunner.query(`CREATE TABLE "quizz-question" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "difficulty" "public"."quizz-question_difficulty_enum" NOT NULL DEFAULT 'MEDIUM', "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "modeId" uuid, CONSTRAINT "PK_1971db832e96de0eb45ec688a8b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "report" ADD "quizzQuestionId" uuid`);
        await queryRunner.query(`ALTER TYPE "public"."mode_gametype_enum" RENAME TO "mode_gametype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."mode_gametype_enum" AS ENUM('neverHave', 'prefer', 'truthDare', 'testPurity', 'mostLikelyTo', 'tenBut', 'quizz')`);
        await queryRunner.query(`ALTER TABLE "mode" ALTER COLUMN "gameType" TYPE "public"."mode_gametype_enum" USING "gameType"::"text"::"public"."mode_gametype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."mode_gametype_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."game_gametype_enum" RENAME TO "game_gametype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."game_gametype_enum" AS ENUM('neverHave', 'prefer', 'truthDare', 'testPurity', 'mostLikelyTo', 'tenBut', 'quizz')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "gameType" TYPE "public"."game_gametype_enum" USING "gameType"::"text"::"public"."game_gametype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."game_gametype_enum_old"`);
        await queryRunner.query(`ALTER TABLE "quizz-question-translation" ADD CONSTRAINT "FK_d2e6f03cdec0d6255081e4ca146" FOREIGN KEY ("quizzQuestionId") REFERENCES "quizz-question"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quizz-answer-translation" ADD CONSTRAINT "FK_ebb827585047c93d02eadaa920b" FOREIGN KEY ("quizzAnswerId") REFERENCES "quizz-answer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quizz-answer" ADD CONSTRAINT "FK_9d2f808fcf06d44cf643fe92ed4" FOREIGN KEY ("quizzQuestionId") REFERENCES "quizz-question"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quizz-question" ADD CONSTRAINT "FK_e592ed481dc99082afbb1f597c8" FOREIGN KEY ("modeId") REFERENCES "mode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "report" ADD CONSTRAINT "FK_8944ddd2b202a2b5f54e39c1c82" FOREIGN KEY ("quizzQuestionId") REFERENCES "quizz-question"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "report" DROP CONSTRAINT "FK_8944ddd2b202a2b5f54e39c1c82"`);
        await queryRunner.query(`ALTER TABLE "quizz-question" DROP CONSTRAINT "FK_e592ed481dc99082afbb1f597c8"`);
        await queryRunner.query(`ALTER TABLE "quizz-answer" DROP CONSTRAINT "FK_9d2f808fcf06d44cf643fe92ed4"`);
        await queryRunner.query(`ALTER TABLE "quizz-answer-translation" DROP CONSTRAINT "FK_ebb827585047c93d02eadaa920b"`);
        await queryRunner.query(`ALTER TABLE "quizz-question-translation" DROP CONSTRAINT "FK_d2e6f03cdec0d6255081e4ca146"`);
        await queryRunner.query(`CREATE TYPE "public"."game_gametype_enum_old" AS ENUM('neverHave', 'prefer', 'truthDare', 'testPurity', 'mostLikelyTo', 'tenBut')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "gameType" TYPE "public"."game_gametype_enum_old" USING "gameType"::"text"::"public"."game_gametype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."game_gametype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."game_gametype_enum_old" RENAME TO "game_gametype_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."mode_gametype_enum_old" AS ENUM('neverHave', 'prefer', 'truthDare', 'testPurity', 'mostLikelyTo', 'tenBut')`);
        await queryRunner.query(`ALTER TABLE "mode" ALTER COLUMN "gameType" TYPE "public"."mode_gametype_enum_old" USING "gameType"::"text"::"public"."mode_gametype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."mode_gametype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."mode_gametype_enum_old" RENAME TO "mode_gametype_enum"`);
        await queryRunner.query(`ALTER TABLE "report" DROP COLUMN "quizzQuestionId"`);
        await queryRunner.query(`DROP TABLE "quizz-question"`);
        await queryRunner.query(`DROP TYPE "public"."quizz-question_difficulty_enum"`);
        await queryRunner.query(`DROP TABLE "quizz-answer"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a9e901c5e40eb11e29a0932038"`);
        await queryRunner.query(`DROP TABLE "quizz-answer-translation"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_786ebc857c545df8bffbc5faff"`);
        await queryRunner.query(`DROP TABLE "quizz-question-translation"`);
    }

}
