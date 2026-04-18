import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Mode } from '../../mode/entities/mode.entity.js';
import { TruthDare } from '../entities/truth-dare.entity.js';
import { TruthDareTranslation } from '../entities/truth-dare-translation.entity.js';
import { CreateTruthDareDto } from '../dto/create-truth-dare.dto.js';
import { ImportTruthDareItemDto } from '../dto/import-truth-dare.dto.js';
import { UpdateTruthDareDto } from '../dto/update-truth-dare.dto.js';
import { CreatePartyTruthDareDto, UserSoloItemDto } from '../dto/create-party-truth-dare.dto.js';
import { Gender } from '../../../types/enums/Gender.js';
import { ChallengeType } from '../../../types/enums/TruthDareChallengeType.js';
import { shuffle } from '../../common/utils/shuffle.js';
import { DEFAULT_LOCALE } from '../../config/languages.js';
import { FlatMode, FlatTruthDare } from '../../../types/ws/FlatQuestion.js';

function pickTranslation<T extends { locale: string }>(translations: T[], locale: string): T | undefined {
  return translations.find((t) => t.locale === locale) ?? translations.find((t) => t.locale === DEFAULT_LOCALE);
}

function flattenMode(mode: any, locale: string): FlatMode | null {
  if (!mode) return null;
  const translations: any[] = mode.translations ?? [];
  const t = translations.find((tr) => tr.locale === locale) ?? translations.find((tr) => tr.locale === DEFAULT_LOCALE);
  if (!t) return null;
  return { id: mode.id, icon: mode.icon ?? null, gameType: mode.gameType, name: t.name, description: t.description };
}

function toTranslationsMap(translations: TruthDareTranslation[]): Record<string, { question: string }> {
  return Object.fromEntries(translations.map((t) => [t.locale, { question: t.question }]));
}

function mapModeTranslations(mode: any): any {
  if (!mode) return mode;
  const translations: any[] = mode.translations ?? [];
  return { ...mode, translations: Object.fromEntries(translations.map((t) => [t.locale, { name: t.name, description: t.description }])) };
}

@Injectable()
export class TruthDareService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(
    page: number,
    limit: number,
    modeId?: string,
    search?: string,
    locale?: string,
    locale_status?: 'translated' | 'untranslated',
  ) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('truthDare')
      .from(TruthDare, 'truthDare')
      .leftJoinAndSelect('truthDare.mode', 'mode')
      .leftJoinAndSelect('mode.translations', 'modeTranslation')
      .leftJoinAndSelect('truthDare.translations', 'translation');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    if (search) {
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('1')
          .from(TruthDareTranslation, 'searchTrans')
          .where('searchTrans.truthDare = truthDare.id')
          .andWhere('searchTrans.question ILIKE :search')
          .getQuery();
        return `(EXISTS ${sub} OR CAST(truthDare.id AS TEXT) ILIKE :search)`;
      });
      qb.setParameter('search', `%${search}%`);
    }

    if (locale && locale_status) {
      const existsOp = locale_status === 'translated' ? 'EXISTS' : 'NOT EXISTS';
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('1')
          .from(TruthDareTranslation, 'filterTrans')
          .where('filterTrans.truthDare = truthDare.id')
          .andWhere('filterTrans.locale = :filterLocale')
          .getQuery();
        return `${existsOp} (${sub})`;
      });
      qb.setParameter('filterLocale', locale);
    }

    const [data, total] = await qb
      .orderBy('truthDare.createdDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((q) => ({ ...q, mode: mapModeTranslations(q.mode), translations: toTranslationsMap(q.translations ?? []) })),
      total,
      page,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };
  }

  async findOne(id: string) {
    const entity = await this.dataSource
      .createQueryBuilder()
      .select('truthDare')
      .from(TruthDare, 'truthDare')
      .leftJoinAndSelect('truthDare.mode', 'mode')
      .leftJoinAndSelect('truthDare.translations', 'translation')
      .where('truthDare.id = :id', { id })
      .getOne();

    if (!entity) return null;
    return { ...entity, translations: toTranslationsMap(entity.translations ?? []) };
  }

  async create(dto: CreateTruthDareDto) {
    try {
      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(TruthDare)
        .values({
          gender: dto.gender,
          type: dto.type,
          mode: { id: dto.modeId },
          mentionedUserGender: dto.mentionedUserGender ?? null,
        })
        .returning('*')
        .execute();

      const id: string = result.raw[0].id;

      const translationsToInsert = Object.entries(dto.translations)
        .filter(([, val]) => val != null)
        .map(([locale, val]) => ({ truthDare: { id }, locale, question: val.question }));

      if (translationsToInsert.length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(TruthDareTranslation)
          .values(translationsToInsert)
          .execute();
      }

      return this.findOne(id);
    } catch (error) {
      if (error.code === '23503') {
        throw new NotFoundException(`Mode with id "${dto.modeId}" not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTruthDareDto) {
    try {
      const updateData: Partial<TruthDare> = {};

      if (dto.gender !== undefined) {
        updateData.gender = dto.gender;
      }

      if (dto.type !== undefined) {
        updateData.type = dto.type;
      }

      if (dto.modeId !== undefined) {
        updateData.mode = { id: dto.modeId } as Mode;
      }

      if (dto.mentionedUserGender !== undefined) {
        updateData.mentionedUserGender = dto.mentionedUserGender;
      }

      if (Object.keys(updateData).length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .update(TruthDare)
          .set(updateData)
          .where('id = :id', { id })
          .execute();
      }

      if (dto.translations) {
        for (const [locale, val] of Object.entries(dto.translations)) {
          if (val === undefined) continue;

          const isEmpty = val === null || !(val.question ?? '').trim();
          if (isEmpty) {
            if (locale === DEFAULT_LOCALE) {
              if (val === null) throw new BadRequestException('Cannot delete the French (reference) translation');
              // empty string for FR: ignore
            } else {
              await this.dataSource
                .createQueryBuilder()
                .delete()
                .from(TruthDareTranslation)
                .where('"truthDareId" = :id AND locale = :locale', { id, locale })
                .execute();
            }
          } else {
            await this.dataSource.getRepository(TruthDareTranslation).upsert(
              [{ truthDare: { id }, locale, question: val!.question!.trim() }],
              { conflictPaths: ['truthDare', 'locale'], skipUpdateIfNoValuesChanged: true },
            );
          }
        }
      }

      return this.findOne(id);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error.code === '23503') {
        throw new NotFoundException(`Mode with id "${dto.modeId}" not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(TruthDare)
      .where('id = :id', { id })
      .execute();
  }

  async exportAll(modeId?: string) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('truthDare')
      .from(TruthDare, 'truthDare')
      .leftJoinAndSelect('truthDare.mode', 'mode')
      .leftJoinAndSelect('truthDare.translations', 'translation');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    const data = await qb.getMany();
    return data.map((q) => ({ ...q, mode: mapModeTranslations(q.mode), translations: toTranslationsMap(q.translations ?? []) }));
  }

  async bulkCreate(items: ImportTruthDareItemDto[]): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const result = await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(TruthDare)
          .values({
            gender: item.gender,
            type: item.type,
            mode: { id: item.modeId },
            mentionedUserGender: item.mentionedUserGender ?? null,
          })
          .returning('id')
          .execute();

        const id: string = result.raw[0].id;

        const translationsToInsert = Object.entries(item.translations)
          .filter(([, val]) => val != null)
          .map(([locale, val]) => ({ truthDare: { id }, locale, question: val.question }));

        if (translationsToInsert.length > 0) {
          await this.dataSource
            .createQueryBuilder()
            .insert()
            .into(TruthDareTranslation)
            .values(translationsToInsert)
            .execute();
        }

        created++;
      } catch (error) {
        if (error.code === '23505') {
          skipped++;
        } else if (error.code === '23503') {
          errors.push(`Ligne ${i + 1}: mode "${item.modeId}" introuvable`);
        } else {
          errors.push(`Ligne ${i + 1}: ${error.message}`);
        }
      }
    }

    return { created, skipped, errors };
  }

  async getTranslationStats() {
    const total = await this.dataSource.getRepository(TruthDare).count();
    const rows = await this.dataSource
      .createQueryBuilder(TruthDareTranslation, 't')
      .select('t.locale', 'locale')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.locale')
      .getRawMany();

    const translations: Record<string, { count: number; percentage: number }> = {};
    for (const row of rows) {
      const count = Number(row.count);
      translations[row.locale] = {
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    }

    return { questions: { total, translations } };
  }

  async createPartySolo(
    dto: CreatePartyTruthDareDto,
    locale: string = DEFAULT_LOCALE,
  ): Promise<{ question: FlatTruthDare; questionType: 'truth-dare'; userTarget: UserSoloItemDto | null; userMentioned: UserSoloItemDto | null }[]> {
    const hasMen = dto.users.some((u) => u.gender === Gender.MAN);
    const hasWomen = dto.users.some((u) => u.gender === Gender.FEMALE);
    const manCount = dto.users.filter((u) => u.gender === Gender.MAN).length;
    const femaleCount = dto.users.filter((u) => u.gender === Gender.FEMALE).length;

    const allowedGenders: Gender[] = [Gender.ALL];
    if (hasMen) allowedGenders.push(Gender.MAN);
    if (hasWomen) allowedGenders.push(Gender.FEMALE);

    const allowedMentionedGenders: Gender[] = [Gender.ALL];
    if (hasMen) allowedMentionedGenders.push(Gender.MAN);
    if (hasWomen) allowedMentionedGenders.push(Gender.FEMALE);

    const customCount = (dto.customQuestions ?? []).filter((cq) => cq.type === 'truth-dare').length;
    const dbLimit = Math.max(0, 50 - customCount);

    const randomIds = dbLimit === 0
      ? []
      : await this.dataSource
          .createQueryBuilder()
          .select('truthDare.id', 'id')
          .from(TruthDare, 'truthDare')
          .where('truthDare.modeId IN (:...modeIds)', { modeIds: dto.modes })
          .andWhere('truthDare.gender IN (:...genders)', { genders: allowedGenders })
          .andWhere('(truthDare.mentionedUserGender IS NULL OR truthDare.mentionedUserGender IN (:...allowedMentionedGenders))', { allowedMentionedGenders })
          .andWhere(
            `NOT (
              truthDare.gender != 'ALL'
              AND truthDare.mentionedUserGender IS NOT NULL
              AND truthDare.mentionedUserGender != 'ALL'
              AND "truthDare"."gender"::text = "truthDare"."mentionedUserGender"::text
              AND (
                (truthDare.gender = 'FEMALE' AND :femaleCount < 2)
                OR (truthDare.gender = 'MAN' AND :manCount < 2)
              )
            )`,
            { femaleCount, manCount },
          )
          .orderBy('RANDOM()')
          .limit(dbLimit)
          .getRawMany<{ id: string }>();

    const questions = randomIds.length === 0
      ? []
      : await this.dataSource
          .createQueryBuilder()
          .select('truthDare')
          .from(TruthDare, 'truthDare')
          .leftJoinAndSelect('truthDare.mode', 'mode')
          .leftJoinAndSelect('mode.translations', 'modeTranslation')
          .leftJoinAndSelect('truthDare.translations', 'translation')
          .where('truthDare.id IN (:...ids)', { ids: randomIds.map((r) => r.id) })
          .getMany();

    const menUsers = dto.users.filter((u) => u.gender === Gender.MAN);
    const womenUsers = dto.users.filter((u) => u.gender === Gender.FEMALE);

    const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const mapped = questions
      .map((question) => {
        const translation = pickTranslation(question.translations ?? [], locale);
        if (!translation) return null;

        const flatQuestion: FlatTruthDare = {
          id: question.id,
          mode: flattenMode(question.mode, locale),
          createdDate: question.createdDate,
          updatedDate: question.updatedDate,
          mentionedUserGender: question.mentionedUserGender,
          gender: question.gender,
          type: question.type,
          question: translation.question,
        };

        let eligibleTargets =
          question.gender === Gender.MAN ? menUsers :
          question.gender === Gender.FEMALE ? womenUsers :
          dto.users;

        // When gender=ALL and mentionedUserGender is specific, prefer a target of a different
        // gender to preserve the mention pool
        if (question.gender === Gender.ALL && question.mentionedUserGender && question.mentionedUserGender !== Gender.ALL) {
          const nonConflicting = eligibleTargets.filter((u) => u.gender !== question.mentionedUserGender);
          if (nonConflicting.length > 0) eligibleTargets = nonConflicting;
        }

        const userTarget = pickRandom(eligibleTargets);

        let userMentioned: UserSoloItemDto | null = null;
        if (question.mentionedUserGender !== null) {
          const mentionedPool = dto.users.filter((u) => u !== userTarget && (
            question.mentionedUserGender === Gender.ALL || u.gender === question.mentionedUserGender
          ));
          userMentioned = mentionedPool.length > 0 ? pickRandom(mentionedPool) : null;
        }

        return { question: flatQuestion, questionType: 'truth-dare' as const, userTarget, userMentioned };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const customMapped = (dto.customQuestions ?? [])
      .filter((cq) => cq.type === 'truth-dare')
      .map((cq) => {
        const fakeQuestion: FlatTruthDare = {
          id: crypto.randomUUID(),
          question: cq.question!,
          type: (cq.challengeType ?? 'DARE') as ChallengeType,
          gender: Gender.ALL,
          mentionedUserGender: null,
          mode: null,
          createdDate: new Date(),
          updatedDate: new Date(),
        };

        return { question: fakeQuestion, questionType: 'truth-dare' as const, userTarget: null, userMentioned: null };
      });

    return shuffle([...mapped, ...customMapped]);
  }
}
