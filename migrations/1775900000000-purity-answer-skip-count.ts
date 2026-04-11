import { MigrationInterface, QueryRunner } from 'typeorm';

export class PurityAnswerSkipCount1775900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purity-answer"
      ADD COLUMN "skipCount" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purity-answer"
      DROP COLUMN "skipCount"
    `);
  }
}
