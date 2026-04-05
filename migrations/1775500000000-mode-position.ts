import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModePosition1775500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mode" ADD COLUMN "position" integer NOT NULL DEFAULT 0`);

    await queryRunner.query(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "gameType" ORDER BY "createdDate" ASC) - 1 AS pos
        FROM "mode"
      )
      UPDATE "mode" SET "position" = ranked.pos FROM ranked WHERE "mode".id = ranked.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mode" DROP COLUMN "position"`);
  }
}
