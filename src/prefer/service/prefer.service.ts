import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Mode } from '../../mode/entities/mode.entity.js';
import { Prefer } from '../entities/prefer.entity.js';
import { PreferTranslation } from '../entities/prefer-translation.entity.js';
import { CreatePreferDto } from '../dto/create-prefer.dto.js';
import { ImportPreferItemDto } from '../dto/import-prefer.dto.js';
import { UpdatePreferDto } from '../dto/update-prefer.dto.js';
import { CreatePartyPreferDto, UserSoloItemDto } from '../dto/create-party-prefer.dto.js';
import { Gender } from '../../../types/enums/Gender.js';
import { shuffle } from '../../common/utils/shuffle.js';
import { DEFAULT_LOCALE } from '../../config/languages.js';
import { FlatMode, FlatPrefer } from '../../../types/ws/FlatQuestion.js';

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

function toTranslationsMap(translations: PreferTranslation[]): Record<string, { choiceOne: string; choiceTwo: string }> {
  return Object.fromEntries(translations.map((t) => [t.locale, { choiceOne: t.choiceOne, choiceTwo: t.choiceTwo }]));
}

function mapModeTranslations(mode: any): any {
  if (!mode) return mode;
  const translations: any[] = mode.translations ?? [];
  return { ...mode, translations: Object.fromEntries(translations.map((t) => [t.locale, { name: t.name, description: t.description }])) };
}

@Injectable()
export class PreferService {
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
      .select('prefer')
      .from(Prefer, 'prefer')
      .leftJoinAndSelect('prefer.mode', 'mode')
      .leftJoinAndSelect('mode.translations', 'modeTranslation')
      .leftJoinAndSelect('prefer.translations', 'translation');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    if (search) {
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('1')
          .from(PreferTranslation, 'searchTrans')
          .where('searchTrans.prefer = prefer.id')
          .andWhere('(searchTrans.choiceOne ILIKE :search OR searchTrans.choiceTwo ILIKE :search)')
          .getQuery();
        return `(EXISTS ${sub} OR CAST(prefer.id AS TEXT) ILIKE :search)`;
      });
      qb.setParameter('search', `%${search}%`);
    }

    if (locale && locale_status) {
      const existsOp = locale_status === 'translated' ? 'EXISTS' : 'NOT EXISTS';
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('1')
          .from(PreferTranslation, 'filterTrans')
          .where('filterTrans.prefer = prefer.id')
          .andWhere('filterTrans.locale = :filterLocale')
          .getQuery();
        return `${existsOp} (${sub})`;
      });
      qb.setParameter('filterLocale', locale);
    }

    const [data, total] = await qb
      .orderBy('prefer.createdDate', 'DESC')
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
      .select('prefer')
      .from(Prefer, 'prefer')
      .leftJoinAndSelect('prefer.mode', 'mode')
      .leftJoinAndSelect('prefer.translations', 'translation')
      .where('prefer.id = :id', { id })
      .getOne();

    if (!entity) return null;
    return { ...entity, translations: toTranslationsMap(entity.translations ?? []) };
  }

  async create(dto: CreatePreferDto) {
    try {
      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(Prefer)
        .values({
          mode: { id: dto.modeId },
          mentionedUserGender: dto.mentionedUserGender ?? null,
        })
        .returning('*')
        .execute();

      const id: string = result.raw[0].id;

      const translationsToInsert = Object.entries(dto.translations)
        .filter(([, val]) => val != null)
        .map(([locale, val]) => ({ prefer: { id }, locale, choiceOne: val.choiceOne, choiceTwo: val.choiceTwo }));

      if (translationsToInsert.length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(PreferTranslation)
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

  async update(id: string, dto: UpdatePreferDto) {
    try {
      const updateData: Partial<Prefer> = {};

      if (dto.modeId !== undefined) {
        updateData.mode = { id: dto.modeId } as Mode;
      }

      if (dto.mentionedUserGender !== undefined) {
        updateData.mentionedUserGender = dto.mentionedUserGender;
      }

      if (Object.keys(updateData).length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .update(Prefer)
          .set(updateData)
          .where('id = :id', { id })
          .execute();
      }

      if (dto.translations) {
        for (const [locale, val] of Object.entries(dto.translations)) {
          if (val === undefined) continue;

          const isEmpty = val === null || (!(val.choiceOne ?? '').trim() && !(val.choiceTwo ?? '').trim());
          if (isEmpty) {
            if (locale === DEFAULT_LOCALE) {
              if (val === null) throw new BadRequestException('Cannot delete the French (reference) translation');
              // empty string for FR: ignore
            } else {
              await this.dataSource
                .createQueryBuilder()
                .delete()
                .from(PreferTranslation)
                .where('"preferId" = :id AND locale = :locale', { id, locale })
                .execute();
            }
          } else {
            await this.dataSource.getRepository(PreferTranslation).upsert(
              [{ prefer: { id }, locale, choiceOne: (val!.choiceOne ?? '').trim(), choiceTwo: (val!.choiceTwo ?? '').trim() }],
              { conflictPaths: ['prefer', 'locale'], skipUpdateIfNoValuesChanged: true },
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
      .from(Prefer)
      .where('id = :id', { id })
      .execute();
  }

  async exportAll(modeId?: string) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('prefer')
      .from(Prefer, 'prefer')
      .leftJoinAndSelect('prefer.mode', 'mode')
      .leftJoinAndSelect('prefer.translations', 'translation');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    const data = await qb.getMany();
    return data.map((q) => ({ ...q, mode: mapModeTranslations(q.mode), translations: toTranslationsMap(q.translations ?? []) }));
  }

  async bulkCreate(items: ImportPreferItemDto[]): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const result = await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(Prefer)
          .values({
            mode: { id: item.modeId },
            mentionedUserGender: item.mentionedUserGender ?? null,
          })
          .returning('id')
          .execute();

        const id: string = result.raw[0].id;

        const translationsToInsert = Object.entries(item.translations)
          .filter(([, val]) => val != null)
          .map(([locale, val]) => ({ prefer: { id }, locale, choiceOne: val.choiceOne, choiceTwo: val.choiceTwo }));

        if (translationsToInsert.length > 0) {
          await this.dataSource
            .createQueryBuilder()
            .insert()
            .into(PreferTranslation)
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
    const total = await this.dataSource.getRepository(Prefer).count();
    const rows = await this.dataSource
      .createQueryBuilder(PreferTranslation, 't')
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
    dto: CreatePartyPreferDto,
    locale: string = DEFAULT_LOCALE,
  ): Promise<{ question: FlatPrefer; questionType: 'prefer'; userTarget: null; userMentioned: UserSoloItemDto | null }[]> {
    const hasMen = dto.users.some((u) => u.gender === Gender.MAN);
    const hasWomen = dto.users.some((u) => u.gender === Gender.FEMALE);

    const allowedMentionedGenders: Gender[] = [Gender.ALL];
    if (hasMen) allowedMentionedGenders.push(Gender.MAN);
    if (hasWomen) allowedMentionedGenders.push(Gender.FEMALE);

    const customCount = (dto.customQuestions ?? []).filter((cq) => cq.type === 'prefer').length;
    const dbLimit = Math.max(0, 50 - customCount);

    const randomIds = dbLimit === 0
      ? []
      : await this.dataSource
          .createQueryBuilder()
          .select('prefer.id', 'id')
          .from(Prefer, 'prefer')
          .where('prefer.modeId IN (:...modeIds)', { modeIds: dto.modes })
          .andWhere('(prefer.mentionedUserGender IS NULL OR prefer.mentionedUserGender IN (:...allowedMentionedGenders))', { allowedMentionedGenders })
          .orderBy('RANDOM()')
          .limit(dbLimit)
          .getRawMany<{ id: string }>();

    const questions = randomIds.length === 0
      ? []
      : await this.dataSource
          .createQueryBuilder()
          .select('prefer')
          .from(Prefer, 'prefer')
          .leftJoinAndSelect('prefer.mode', 'mode')
          .leftJoinAndSelect('mode.translations', 'modeTranslation')
          .leftJoinAndSelect('prefer.translations', 'translation')
          .where('prefer.id IN (:...ids)', { ids: randomIds.map((r) => r.id) })
          .getMany();

    const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const pickUser = (gender: Gender | null): UserSoloItemDto | null => {
      if (gender === null) return null;
      const pool = dto.users.filter((u) => gender === Gender.ALL || u.gender === gender);
      const finalPool = pool.length > 0 ? pool : dto.users;
      return finalPool.length > 0 ? pickRandom(finalPool) : null;
    };

    const mapped = questions
      .map((question) => {
        const translation = pickTranslation(question.translations ?? [], locale);
        if (!translation) return null;

        const flatQuestion: FlatPrefer = {
          id: question.id,
          mode: flattenMode(question.mode, locale),
          createdDate: question.createdDate,
          updatedDate: question.updatedDate,
          mentionedUserGender: question.mentionedUserGender,
          choiceOne: translation.choiceOne,
          choiceTwo: translation.choiceTwo,
        };

        const hasUserPlaceholder = translation.choiceOne.includes('{user}') || translation.choiceTwo.includes('{user}');
        const genderToUse = question.mentionedUserGender ?? (hasUserPlaceholder ? Gender.ALL : null);

        return {
          question: flatQuestion,
          questionType: 'prefer' as const,
          userTarget: null,
          userMentioned: pickUser(genderToUse),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const customMapped = (dto.customQuestions ?? [])
      .filter((cq) => cq.type === 'prefer')
      .map((cq) => {
        const fakeQuestion: FlatPrefer = {
          id: crypto.randomUUID(),
          choiceOne: cq.choiceOne!,
          choiceTwo: cq.choiceTwo!,
          mentionedUserGender: null,
          mode: null,
          createdDate: new Date(),
          updatedDate: new Date(),
        };

        return { question: fakeQuestion, questionType: 'prefer' as const, userTarget: null, userMentioned: null };
      });

    return shuffle([...mapped, ...customMapped]);
  }
}
