import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateNeverHaveDto } from '../dto/create-never-have.dto.js';
import { ImportNeverHaveItemDto } from '../dto/import-never-have.dto.js';
import { NeverHave } from '../entities/never-have.entity.js';
import { NeverHaveTranslation } from '../entities/never-have-translation.entity.js';
import { UpdateNeverHaveDto } from '../dto/update-never-have.dto.js';
import { Mode } from '../../mode/entities/mode.entity.js';
import { CreatePartyNeverHaveDto, UserSoloItemDto } from '../dto/create-party-never-have.dto.js';
import { Gender } from '../../../types/enums/Gender.js';
import { shuffle } from '../../common/utils/shuffle.js';
import { DEFAULT_LOCALE } from '../../config/languages.js';
import { FlatMode, FlatNeverHave } from '../../../types/ws/FlatQuestion.js';

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

function toTranslationsMap(translations: NeverHaveTranslation[]): Record<string, { question: string }> {
  return Object.fromEntries(translations.map((t) => [t.locale, { question: t.question }]));
}

function mapModeTranslations(mode: any): any {
  if (!mode) return mode;
  const translations: any[] = mode.translations ?? [];
  return { ...mode, translations: Object.fromEntries(translations.map((t) => [t.locale, { name: t.name, description: t.description }])) };
}

@Injectable()
export class NeverHaveService {
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
      .select('neverHave')
      .from(NeverHave, 'neverHave')
      .leftJoinAndSelect('neverHave.mode', 'mode')
      .leftJoinAndSelect('mode.translations', 'modeTranslation')
      .leftJoinAndSelect('neverHave.translations', 'translation');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    if (search) {
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('1')
          .from(NeverHaveTranslation, 'searchTrans')
          .where('searchTrans.neverHave = neverHave.id')
          .andWhere('searchTrans.question ILIKE :search')
          .getQuery();
        return `(EXISTS ${sub} OR CAST(neverHave.id AS TEXT) ILIKE :search)`;
      });
      qb.setParameter('search', `%${search}%`);
    }

    if (locale && locale_status) {
      const existsOp = locale_status === 'translated' ? 'EXISTS' : 'NOT EXISTS';
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('1')
          .from(NeverHaveTranslation, 'filterTrans')
          .where('filterTrans.neverHave = neverHave.id')
          .andWhere('filterTrans.locale = :filterLocale')
          .getQuery();
        return `${existsOp} (${sub})`;
      });
      qb.setParameter('filterLocale', locale);
    }

    const [data, total] = await qb
      .orderBy('neverHave.createdDate', 'DESC')
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
      .select('neverHave')
      .from(NeverHave, 'neverHave')
      .leftJoinAndSelect('neverHave.mode', 'mode')
      .leftJoinAndSelect('neverHave.translations', 'translation')
      .where('neverHave.id = :id', { id })
      .getOne();

    if (!entity) return null;
    return { ...entity, translations: toTranslationsMap(entity.translations ?? []) };
  }

  async create(dto: CreateNeverHaveDto) {
    try {
      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(NeverHave)
        .values({
          mode: { id: dto.modeId },
          mentionedUserGender: dto.mentionedUserGender ?? null,
        })
        .returning('*')
        .execute();

      const id: string = result.raw[0].id;

      const translationsToInsert = Object.entries(dto.translations)
        .filter(([, val]) => val != null)
        .map(([locale, val]) => ({ neverHave: { id }, locale, question: val.question }));

      if (translationsToInsert.length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(NeverHaveTranslation)
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

  async update(id: string, dto: UpdateNeverHaveDto) {
    try {
      const updateData: Partial<NeverHave> = {};

      if (dto.modeId !== undefined) {
        updateData.mode = { id: dto.modeId } as Mode;
      }

      if (dto.mentionedUserGender !== undefined) {
        updateData.mentionedUserGender = dto.mentionedUserGender;
      }

      if (Object.keys(updateData).length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .update(NeverHave)
          .set(updateData)
          .where('id = :id', { id })
          .execute();
      }

      if (dto.translations) {
        for (const [locale, val] of Object.entries(dto.translations)) {
          if (val === undefined) continue;

          if (val === null) {
            if (locale === DEFAULT_LOCALE) {
              throw new BadRequestException('Cannot delete the French (reference) translation');
            }
            await this.dataSource
              .createQueryBuilder()
              .delete()
              .from(NeverHaveTranslation)
              .where('"neverHaveId" = :id AND locale = :locale', { id, locale })
              .execute();
          } else {
            await this.dataSource.getRepository(NeverHaveTranslation).upsert(
              [{ neverHave: { id }, locale, question: val.question }],
              { conflictPaths: ['neverHave', 'locale'], skipUpdateIfNoValuesChanged: true },
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
      .from(NeverHave)
      .where('id = :id', { id })
      .execute();
  }

  async exportAll(modeId?: string) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('neverHave')
      .from(NeverHave, 'neverHave')
      .leftJoinAndSelect('neverHave.mode', 'mode')
      .leftJoinAndSelect('neverHave.translations', 'translation');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    const data = await qb.getMany();
    return data.map((q) => ({ ...q, mode: mapModeTranslations(q.mode), translations: toTranslationsMap(q.translations ?? []) }));
  }

  async bulkCreate(items: ImportNeverHaveItemDto[]): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const result = await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(NeverHave)
          .values({
            mode: { id: item.modeId },
            mentionedUserGender: (item as any).mentionedUserGender ?? null,
          })
          .returning('id')
          .execute();

        const id: string = result.raw[0].id;

        const translationsToInsert = Object.entries(item.translations)
          .filter(([, val]) => val != null)
          .map(([locale, val]) => ({ neverHave: { id }, locale, question: val.question }));

        if (translationsToInsert.length > 0) {
          await this.dataSource
            .createQueryBuilder()
            .insert()
            .into(NeverHaveTranslation)
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
    const total = await this.dataSource.getRepository(NeverHave).count();
    const rows = await this.dataSource
      .createQueryBuilder(NeverHaveTranslation, 't')
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
    dto: CreatePartyNeverHaveDto,
    locale: string = DEFAULT_LOCALE,
  ): Promise<{ question: FlatNeverHave; questionType: 'never-have'; userTarget: null; userMentioned: UserSoloItemDto | null }[]> {
    const hasMen = dto.users.some((u) => u.gender === Gender.MAN);
    const hasWomen = dto.users.some((u) => u.gender === Gender.FEMALE);

    const allowedMentionedGenders: Gender[] = [Gender.ALL];
    if (hasMen) allowedMentionedGenders.push(Gender.MAN);
    if (hasWomen) allowedMentionedGenders.push(Gender.FEMALE);

    const customCount = (dto.customQuestions ?? []).filter((cq) => cq.type === 'never-have').length;
    const dbLimit = Math.max(0, 50 - customCount);

    const randomIds = dbLimit === 0
      ? []
      : await this.dataSource
          .createQueryBuilder()
          .select('neverHave.id', 'id')
          .from(NeverHave, 'neverHave')
          .where('neverHave.modeId IN (:...modeIds)', { modeIds: dto.modes })
          .andWhere('(neverHave.mentionedUserGender IS NULL OR neverHave.mentionedUserGender IN (:...allowedMentionedGenders))', { allowedMentionedGenders })
          .orderBy('RANDOM()')
          .limit(dbLimit)
          .getRawMany<{ id: string }>();

    const questions = randomIds.length === 0
      ? []
      : await this.dataSource
          .createQueryBuilder()
          .select('neverHave')
          .from(NeverHave, 'neverHave')
          .leftJoinAndSelect('neverHave.mode', 'mode')
          .leftJoinAndSelect('mode.translations', 'modeTranslation')
          .leftJoinAndSelect('neverHave.translations', 'translation')
          .where('neverHave.id IN (:...ids)', { ids: randomIds.map((r) => r.id) })
          .getMany();

    const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const mapped = questions
      .map((question) => {
        const translation = pickTranslation(question.translations ?? [], locale);
        if (!translation) return null;

        const flatQuestion: FlatNeverHave = {
          id: question.id,
          mode: flattenMode(question.mode, locale),
          createdDate: question.createdDate,
          updatedDate: question.updatedDate,
          mentionedUserGender: question.mentionedUserGender,
          question: translation.question,
        };

        let userMentioned: UserSoloItemDto | null = null;
        if (question.mentionedUserGender !== null) {
          const mentionedPool = dto.users.filter((u) =>
            question.mentionedUserGender === Gender.ALL || u.gender === question.mentionedUserGender,
          );
          const pool = mentionedPool.length > 0 ? mentionedPool : dto.users;
          userMentioned = pool.length > 0 ? pickRandom(pool) : null;
        }
        return { question: flatQuestion, questionType: 'never-have' as const, userTarget: null, userMentioned };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const customMapped = (dto.customQuestions ?? [])
      .filter((cq) => cq.type === 'never-have')
      .map((cq) => {
        const fakeQuestion: FlatNeverHave = {
          id: crypto.randomUUID(),
          question: cq.question!,
          mentionedUserGender: null,
          mode: null,
          createdDate: new Date(),
          updatedDate: new Date(),
        };

        return { question: fakeQuestion, questionType: 'never-have' as const, userTarget: null, userMentioned: null };
      });

    return shuffle([...mapped, ...customMapped]);
  }
}
