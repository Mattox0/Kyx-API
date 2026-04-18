import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Mode } from '../../mode/entities/mode.entity.js';
import { TenBut } from '../entities/ten-but.entity.js';
import { TenButTranslation } from '../entities/ten-but-translation.entity.js';
import { CreateTenButDto } from '../dto/create-ten-but.dto.js';
import { ImportTenButItemDto } from '../dto/import-ten-but.dto.js';
import { UpdateTenButDto } from '../dto/update-ten-but.dto.js';
import { CreatePartyTenButDto, UserSoloItemDto } from '../dto/create-party-ten-but.dto.js';
import { Gender } from '../../../types/enums/Gender.js';
import { shuffle } from '../../common/utils/shuffle.js';
import { DEFAULT_LOCALE } from '../../config/languages.js';
import { FlatMode, FlatTenBut } from '../../../types/ws/FlatQuestion.js';

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

function toTranslationsMap(translations: TenButTranslation[]): Record<string, { question: string }> {
  return Object.fromEntries(translations.map((t) => [t.locale, { question: t.question }]));
}

function mapModeTranslations(mode: any): any {
  if (!mode) return mode;
  const translations: any[] = mode.translations ?? [];
  return { ...mode, translations: Object.fromEntries(translations.map((t) => [t.locale, { name: t.name, description: t.description }])) };
}

@Injectable()
export class TenButService {
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
      .select('tenBut')
      .from(TenBut, 'tenBut')
      .leftJoinAndSelect('tenBut.mode', 'mode')
      .leftJoinAndSelect('mode.translations', 'modeTranslation')
      .leftJoinAndSelect('tenBut.translations', 'translation');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    if (search) {
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('1')
          .from(TenButTranslation, 'searchTrans')
          .where('searchTrans.tenBut = tenBut.id')
          .andWhere('searchTrans.question ILIKE :search')
          .getQuery();
        return `(EXISTS ${sub} OR CAST(tenBut.id AS TEXT) ILIKE :search)`;
      });
      qb.setParameter('search', `%${search}%`);
    }

    if (locale && locale_status) {
      const existsOp = locale_status === 'translated' ? 'EXISTS' : 'NOT EXISTS';
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('1')
          .from(TenButTranslation, 'filterTrans')
          .where('filterTrans.tenBut = tenBut.id')
          .andWhere('filterTrans.locale = :filterLocale')
          .getQuery();
        return `${existsOp} (${sub})`;
      });
      qb.setParameter('filterLocale', locale);
    }

    const [data, total] = await qb
      .orderBy('tenBut.createdDate', 'DESC')
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
      .select('tenBut')
      .from(TenBut, 'tenBut')
      .leftJoinAndSelect('tenBut.mode', 'mode')
      .leftJoinAndSelect('tenBut.translations', 'translation')
      .where('tenBut.id = :id', { id })
      .getOne();

    if (!entity) return null;
    return { ...entity, translations: toTranslationsMap(entity.translations ?? []) };
  }

  async create(dto: CreateTenButDto) {
    const frQuestion = dto.translations[DEFAULT_LOCALE]?.question?.trim().toLowerCase();
    if (frQuestion) {
      const existing = await this.dataSource
        .createQueryBuilder(TenButTranslation, 't')
        .where('LOWER(t.question) = :q', { q: frQuestion })
        .getOne();
      if (existing) throw new BadRequestException('Cette question existe déjà');
    }

    try {
      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(TenBut)
        .values({
          mode: { id: dto.modeId },
          score: dto.score,
          mentionedUserGender: dto.mentionedUserGender ?? null,
        })
        .returning('*')
        .execute();

      const id: string = result.raw[0].id;

      const translationsToInsert = Object.entries(dto.translations)
        .filter(([, val]) => val != null)
        .map(([locale, val]) => ({ tenBut: { id }, locale, question: val.question }));

      if (translationsToInsert.length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(TenButTranslation)
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

  async update(id: string, dto: UpdateTenButDto) {
    try {
      const updateData: Partial<TenBut> = {};

      if (dto.modeId !== undefined) {
        updateData.mode = { id: dto.modeId } as Mode;
      }

      if (dto.score !== undefined) {
        updateData.score = dto.score;
      }

      if ('mentionedUserGender' in dto) {
        updateData.mentionedUserGender = dto.mentionedUserGender ?? null;
      }

      if (Object.keys(updateData).length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .update(TenBut)
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
            } else {
              await this.dataSource
                .createQueryBuilder()
                .delete()
                .from(TenButTranslation)
                .where('"tenButId" = :id AND locale = :locale', { id, locale })
                .execute();
            }
          } else {
            await this.dataSource.getRepository(TenButTranslation).upsert(
              [{ tenBut: { id }, locale, question: (val!.question ?? '').trim() }],
              { conflictPaths: ['tenBut', 'locale'], skipUpdateIfNoValuesChanged: true },
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
      .from(TenBut)
      .where('id = :id', { id })
      .execute();
  }

  async exportAll(modeId?: string) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('tenBut')
      .from(TenBut, 'tenBut')
      .leftJoinAndSelect('tenBut.mode', 'mode')
      .leftJoinAndSelect('tenBut.translations', 'translation');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    const data = await qb.getMany();
    return data.map((q) => ({ ...q, mode: mapModeTranslations(q.mode), translations: toTranslationsMap(q.translations ?? []) }));
  }

  async bulkCreate(items: ImportTenButItemDto[]): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    const existingQuestions = await this.dataSource
      .createQueryBuilder(TenButTranslation, 't')
      .select('LOWER(t.question)', 'question')
      .getRawMany<{ question: string }>();

    const existingSet = new Set(existingQuestions.map((r) => r.question.trim().toLowerCase()));

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const frQuestion = item.translations[DEFAULT_LOCALE]?.question?.trim().toLowerCase();
        if (frQuestion && existingSet.has(frQuestion)) {
          skipped++;
          continue;
        }

        const result = await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(TenBut)
          .values({
            mode: { id: item.modeId },
            score: item.score,
            mentionedUserGender: item.mentionedUserGender ?? null,
          })
          .returning('id')
          .execute();

        const id: string = result.raw[0].id;

        const translationsToInsert = Object.entries(item.translations)
          .filter(([, val]) => val != null)
          .map(([locale, val]) => ({ tenBut: { id }, locale, question: val.question }));

        if (translationsToInsert.length > 0) {
          await this.dataSource
            .createQueryBuilder()
            .insert()
            .into(TenButTranslation)
            .values(translationsToInsert)
            .execute();
        }

        if (frQuestion) existingSet.add(frQuestion);
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
    const total = await this.dataSource.getRepository(TenBut).count();
    const rows = await this.dataSource
      .createQueryBuilder(TenButTranslation, 't')
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
    dto: CreatePartyTenButDto,
    locale: string = DEFAULT_LOCALE,
  ): Promise<{ question: FlatTenBut; questionType: 'ten-but'; userTarget: null; userMentioned: UserSoloItemDto | null }[]> {
    const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const customCount = (dto.customQuestions ?? []).filter((cq) => cq.type === 'ten-but').length;
    const dbLimit = Math.max(0, 50 - customCount);

    const randomIds = dbLimit === 0
      ? []
      : await this.dataSource
          .createQueryBuilder()
          .select('tenBut.id', 'id')
          .from(TenBut, 'tenBut')
          .where('tenBut.modeId IN (:...modeIds)', { modeIds: dto.modes })
          .orderBy('RANDOM()')
          .limit(dbLimit)
          .getRawMany<{ id: string }>();

    const questions = randomIds.length === 0
      ? []
      : await this.dataSource
          .createQueryBuilder()
          .select('tenBut')
          .from(TenBut, 'tenBut')
          .leftJoinAndSelect('tenBut.mode', 'mode')
          .leftJoinAndSelect('mode.translations', 'modeTranslation')
          .leftJoinAndSelect('tenBut.translations', 'translation')
          .where('tenBut.id IN (:...ids)', { ids: randomIds.map((r) => r.id) })
          .getMany();

    const mapped = questions
      .map((question) => {
        const translation = pickTranslation(question.translations ?? [], locale);
        if (!translation) return null;

        const flatQuestion: FlatTenBut = {
          id: question.id,
          mode: flattenMode(question.mode, locale),
          createdDate: question.createdDate,
          updatedDate: question.updatedDate,
          mentionedUserGender: question.mentionedUserGender ?? null,
          score: question.score,
          question: translation.question,
        };

        let userMentioned: UserSoloItemDto | null = null;
        if (question.mentionedUserGender !== null && question.mentionedUserGender !== undefined) {
          const pool = dto.users.filter((u) =>
            question.mentionedUserGender === Gender.ALL || u.gender === question.mentionedUserGender,
          );
          userMentioned = (pool.length > 0 ? pool : dto.users).length > 0
            ? pickRandom(pool.length > 0 ? pool : dto.users)
            : null;
        }

        return {
          question: flatQuestion,
          questionType: 'ten-but' as const,
          userTarget: null,
          userMentioned,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const customMapped = (dto.customQuestions ?? [])
      .filter((cq) => cq.type === 'ten-but')
      .map((cq) => {
        const fakeQuestion: FlatTenBut = {
          id: crypto.randomUUID(),
          score: (cq as any).score ?? 10,
          question: cq.question!,
          mentionedUserGender: null,
          mode: null,
          createdDate: new Date(),
          updatedDate: new Date(),
        };

        return { question: fakeQuestion, questionType: 'ten-but' as const, userTarget: null, userMentioned: null };
      });

    return shuffle([...mapped, ...customMapped]);
  }
}
