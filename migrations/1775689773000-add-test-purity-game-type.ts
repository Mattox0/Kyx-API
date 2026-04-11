import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTestPurityGameType1775689773000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "mode_gametype_enum" ADD VALUE 'testPurity'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL ne supporte pas DROP VALUE sur un enum
    // Pour rollback : recréer l'enum sans 'testPurity' et migrer les colonnes
    await queryRunner.query(`
      DELETE FROM "mode" WHERE "gameType" = 'testPurity'
    `);
    await queryRunner.query(`
      ALTER TYPE "mode_gametype_enum" RENAME TO "mode_gametype_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "mode_gametype_enum" AS ENUM ('neverHave', 'prefer', 'truthDare')
    `);
    await queryRunner.query(`
      ALTER TABLE "mode" ALTER COLUMN "gameType" TYPE "mode_gametype_enum"
        USING "gameType"::text::"mode_gametype_enum"
    `);
    await queryRunner.query(`DROP TYPE "mode_gametype_enum_old"`);
  }
}
