import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1773353959256 implements MigrationInterface {
    name = 'Migration1773353959256'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "prefer" RENAME COLUMN "mentionedUserOneGender" TO "mentionedUserGender"`);
        await queryRunner.query(`ALTER TYPE "public"."prefer_mentioneduseronegender_enum" RENAME TO "prefer_mentionedusergender_enum"`);
        await queryRunner.query(`ALTER TABLE "prefer" DROP COLUMN "mentionedUserTwoGender"`);
        await queryRunner.query(`DROP TYPE "public"."prefer_mentionedusertwogender_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."prefer_mentionedusertwogender_enum" AS ENUM('MAN', 'FEMALE', 'ALL')`);
        await queryRunner.query(`ALTER TABLE "prefer" ADD "mentionedUserTwoGender" "public"."prefer_mentionedusertwogender_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."prefer_mentionedusergender_enum" RENAME TO "prefer_mentioneduseronegender_enum"`);
        await queryRunner.query(`ALTER TABLE "prefer" RENAME COLUMN "mentionedUserGender" TO "mentionedUserOneGender"`);
    }

}
