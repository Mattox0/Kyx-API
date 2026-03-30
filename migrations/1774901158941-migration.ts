import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1774901158941 implements MigrationInterface {
    name = 'Migration1774901158941'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "device_token" ADD "userId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_ba0cbbc3097f061e197e71c112" ON "device_token" ("userId") `);
        await queryRunner.query(`ALTER TABLE "device_token" ADD CONSTRAINT "FK_ba0cbbc3097f061e197e71c112e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "device_token" DROP CONSTRAINT "FK_ba0cbbc3097f061e197e71c112e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba0cbbc3097f061e197e71c112"`);
        await queryRunner.query(`ALTER TABLE "device_token" DROP COLUMN "userId"`);
    }

}
