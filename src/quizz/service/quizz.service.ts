import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Mode } from '../../mode/entities/mode.entity.js';
import { QuizzQuestion } from '../entities/quizz-question.entity.js';
import { QuizzQuestionTranslation } from '../entities/quizz-question-translation.entity.js';
import { QuizzAnswer } from '../entities/quizz-answer.entity.js';
import { QuizzAnswerTranslation } from '../entities/quizz-answer-translation.entity.js';
import { CreateQuizzDto } from '../dto/create-quizz.dto.js';
import { ImportQuizzItemDto } from '../dto/import-quizz.dto.js';
import { UpdateQuizzDto } from '../dto/update-quizz.dto.js';
import { CreatePartyQuizzDto, UserSoloItemDto } from '../dto/create-party-quizz.dto.js';
import { shuffle } from '../../common/utils/shuffle.js';
import { DEFAULT_LOCALE } from '../../config/languages.js';
import { FlatMode, FlatQuizz, FlatQuizzAnswer } from '../../../types/ws/FlatQuestion.js';
import { QuizzDifficulty } from '../../../types/enums/QuizzDifficulty.js';

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

function toTranslationsMap(translations: QuizzQuestionTranslation[]): Record<string, { text: string }> {
  return Object.fromEntries(translations.map((t) => [t.locale, { text: t.text }]));
}

function answersToMap(answers: QuizzAnswer[]): any[] {
  return answers.map((a) => ({
    id: a.id,
    isCorrect: a.isCorrect,
    createdDate: a.createdDate,
    translations: Object.fromEntries((a.translations ?? []).map((t) => [t.locale, { text: t.text }])),
  }));
}

function mapModeTranslations(mode: any): any {
  if (!mode) return mode;
  const translations: any[] = mode.translations ?? [];
  return { ...mode, translations: Object.fromEntries(translations.map((t) => [t.locale, { name: t.name, description: t.description }])) };
}

@Injectable()
export class QuizzService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(
    page: number,
    limit: number,
    modeId?: string,
    search?: string,
    locale?: string,
    locale_status?: 'translated' | 'untranslated',
    difficulty?: QuizzDifficulty,
  ) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('quizz')
      .from(QuizzQuestion, 'quizz')
      .leftJoinAndSelect('quizz.mode', 'mode')
      .leftJoinAndSelect('mode.translations', 'modeTranslation')
      .leftJoinAndSelect('quizz.translations', 'translation')
      .leftJoinAndSelect('quizz.answers', 'answer')
      .leftJoinAndSelect('answer.translations', 'answerTranslation');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    if (difficulty) {
      qb.andWhere('quizz.difficulty = :difficulty', { difficulty });
    }

    if (search) {
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('1')
          .from(QuizzQuestionTranslation, 'searchTrans')
          .where('searchTrans.quizzQuestion = quizz.id')
          .andWhere('searchTrans.text ILIKE :search')
          .getQuery();
        return `(EXISTS ${sub} OR CAST(quizz.id AS TEXT) ILIKE :search)`;
      });
      qb.setParameter('search', `%${search}%`);
    }

    if (locale && locale_status) {
      const existsOp = locale_status === 'translated' ? 'EXISTS' : 'NOT EXISTS';
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('1')
          .from(QuizzQuestionTranslation, 'filterTrans')
          .where('filterTrans.quizzQuestion = quizz.id')
          .andWhere('filterTrans.locale = :filterLocale')
          .getQuery();
        return `${existsOp} (${sub})`;
      });
      qb.setParameter('filterLocale', locale);
    }

    const [data, total] = await qb
      .orderBy('quizz.createdDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((q) => ({
        ...q,
        mode: mapModeTranslations(q.mode),
        translations: toTranslationsMap(q.translations ?? []),
        answers: answersToMap(q.answers ?? []),
      })),
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
      .select('quizz')
      .from(QuizzQuestion, 'quizz')
      .leftJoinAndSelect('quizz.mode', 'mode')
      .leftJoinAndSelect('quizz.translations', 'translation')
      .leftJoinAndSelect('quizz.answers', 'answer')
      .leftJoinAndSelect('answer.translations', 'answerTranslation')
      .where('quizz.id = :id', { id })
      .getOne();

    if (!entity) return null;
    return {
      ...entity,
      translations: toTranslationsMap(entity.translations ?? []),
      answers: answersToMap(entity.answers ?? []),
    };
  }

  async create(dto: CreateQuizzDto) {
    try {
      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(QuizzQuestion)
        .values({
          mode: { id: dto.modeId },
          difficulty: dto.difficulty,
        })
        .returning('*')
        .execute();

      const questionId: string = result.raw[0].id;

      const translationsToInsert = Object.entries(dto.translations)
        .filter(([, val]) => val != null)
        .map(([locale, val]) => ({ quizzQuestion: { id: questionId }, locale, text: val.text }));

      if (translationsToInsert.length > 0) {
        await this.dataSource.createQueryBuilder().insert().into(QuizzQuestionTranslation).values(translationsToInsert).execute();
      }

      for (const answerDto of dto.answers) {
        const answerResult = await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(QuizzAnswer)
          .values({ quizzQuestion: { id: questionId }, isCorrect: answerDto.isCorrect })
          .returning('*')
          .execute();

        const answerId: string = answerResult.raw[0].id;

        const answerTranslations = Object.entries(answerDto.translations)
          .filter(([, val]) => val != null)
          .map(([locale, val]) => ({ quizzAnswer: { id: answerId }, locale, text: val.text }));

        if (answerTranslations.length > 0) {
          await this.dataSource.createQueryBuilder().insert().into(QuizzAnswerTranslation).values(answerTranslations).execute();
        }
      }

      return this.findOne(questionId);
    } catch (error) {
      if (error.code === '23503') {
        throw new NotFoundException(`Mode with id "${dto.modeId}" not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateQuizzDto) {
    try {
      const updateData: Partial<QuizzQuestion> = {};

      if (dto.modeId !== undefined) {
        updateData.mode = { id: dto.modeId } as Mode;
      }
      if (dto.difficulty !== undefined) {
        updateData.difficulty = dto.difficulty;
      }

      if (Object.keys(updateData).length > 0) {
        await this.dataSource.createQueryBuilder().update(QuizzQuestion).set(updateData).where('id = :id', { id }).execute();
      }

      if (dto.translations) {
        for (const [locale, val] of Object.entries(dto.translations)) {
          if (val === undefined) continue;
          const isEmpty = val === null || !(val.text ?? '').trim();
          if (isEmpty) {
            if (locale === DEFAULT_LOCALE) {
              if (val === null) throw new BadRequestException('Cannot delete the French (reference) translation');
            } else {
              await this.dataSource
                .createQueryBuilder()
                .delete()
                .from(QuizzQuestionTranslation)
                .where('"quizzQuestionId" = :id AND locale = :locale', { id, locale })
                .execute();
            }
          } else {
            await this.dataSource.getRepository(QuizzQuestionTranslation).upsert(
              [{ quizzQuestion: { id }, locale, text: (val!.text ?? '').trim() }],
              { conflictPaths: ['quizzQuestion', 'locale'], skipUpdateIfNoValuesChanged: true },
            );
          }
        }
      }

      if (dto.answers) {
        for (const answerDto of dto.answers) {
          if (answerDto.id) {
            if (answerDto.isCorrect !== undefined) {
              await this.dataSource
                .createQueryBuilder()
                .update(QuizzAnswer)
                .set({ isCorrect: answerDto.isCorrect })
                .where('id = :id', { id: answerDto.id })
                .execute();
            }
            if (answerDto.translations) {
              for (const [locale, val] of Object.entries(answerDto.translations)) {
                if (val === undefined) continue;
                const isEmpty = val === null || !(val.text ?? '').trim();
                if (isEmpty) {
                  if (locale !== DEFAULT_LOCALE) {
                    await this.dataSource
                      .createQueryBuilder()
                      .delete()
                      .from(QuizzAnswerTranslation)
                      .where('"quizzAnswerId" = :answerId AND locale = :locale', { answerId: answerDto.id, locale })
                      .execute();
                  }
                } else {
                  await this.dataSource.getRepository(QuizzAnswerTranslation).upsert(
                    [{ quizzAnswer: { id: answerDto.id }, locale, text: (val!.text ?? '').trim() }],
                    { conflictPaths: ['quizzAnswer', 'locale'], skipUpdateIfNoValuesChanged: true },
                  );
                }
              }
            }
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
    await this.dataSource.createQueryBuilder().delete().from(QuizzQuestion).where('id = :id', { id }).execute();
  }

  async exportAll(modeId?: string) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('quizz')
      .from(QuizzQuestion, 'quizz')
      .leftJoinAndSelect('quizz.mode', 'mode')
      .leftJoinAndSelect('quizz.translations', 'translation')
      .leftJoinAndSelect('quizz.answers', 'answer')
      .leftJoinAndSelect('answer.translations', 'answerTranslation');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    const data = await qb.getMany();
    return data.map((q) => ({
      ...q,
      mode: mapModeTranslations(q.mode),
      translations: toTranslationsMap(q.translations ?? []),
      answers: answersToMap(q.answers ?? []),
    }));
  }

  async bulkCreate(items: ImportQuizzItemDto[]): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const result = await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(QuizzQuestion)
          .values({
            mode: { id: item.modeId },
            difficulty: item.difficulty ?? QuizzDifficulty.MEDIUM,
          })
          .returning('id')
          .execute();

        const questionId: string = result.raw[0].id;

        const translationsToInsert = Object.entries(item.translations)
          .filter(([, val]) => val != null)
          .map(([locale, val]) => ({ quizzQuestion: { id: questionId }, locale, text: val.text }));

        if (translationsToInsert.length > 0) {
          await this.dataSource.createQueryBuilder().insert().into(QuizzQuestionTranslation).values(translationsToInsert).execute();
        }

        for (const answerDto of item.answers) {
          const answerResult = await this.dataSource
            .createQueryBuilder()
            .insert()
            .into(QuizzAnswer)
            .values({ quizzQuestion: { id: questionId }, isCorrect: answerDto.isCorrect })
            .returning('id')
            .execute();

          const answerId: string = answerResult.raw[0].id;

          const answerTranslations = Object.entries(answerDto.translations)
            .filter(([, val]) => val != null)
            .map(([locale, val]) => ({ quizzAnswer: { id: answerId }, locale, text: val.text }));

          if (answerTranslations.length > 0) {
            await this.dataSource.createQueryBuilder().insert().into(QuizzAnswerTranslation).values(answerTranslations).execute();
          }
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
    const total = await this.dataSource.getRepository(QuizzQuestion).count();
    const rows = await this.dataSource
      .createQueryBuilder(QuizzQuestionTranslation, 't')
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
    dto: CreatePartyQuizzDto,
    locale: string = DEFAULT_LOCALE,
  ): Promise<{ question: FlatQuizz; questionType: 'quizz'; userTarget: null; userMentioned: null }[]> {
    const customCount = (dto.customQuestions ?? []).filter((cq) => cq.type === 'quizz').length;
    const dbLimit = Math.max(0, 50 - customCount);

    const difficulties = dto.difficulties && dto.difficulties.length > 0 ? dto.difficulties : null;

    const randomIds = dbLimit === 0
      ? []
      : await this.dataSource
          .createQueryBuilder()
          .select('quizz.id', 'id')
          .from(QuizzQuestion, 'quizz')
          .where('quizz.modeId IN (:...modeIds)', { modeIds: dto.modes })
          .andWhere(
            difficulties
              ? 'quizz.difficulty IN (:...difficulties)'
              : '1=1',
            difficulties ? { difficulties } : {},
          )
          .orderBy('RANDOM()')
          .limit(dbLimit)
          .getRawMany<{ id: string }>();

    const questions = randomIds.length === 0
      ? []
      : await this.dataSource
          .createQueryBuilder()
          .select('quizz')
          .from(QuizzQuestion, 'quizz')
          .leftJoinAndSelect('quizz.mode', 'mode')
          .leftJoinAndSelect('mode.translations', 'modeTranslation')
          .leftJoinAndSelect('quizz.translations', 'translation')
          .leftJoinAndSelect('quizz.answers', 'answer')
          .leftJoinAndSelect('answer.translations', 'answerTranslation')
          .where('quizz.id IN (:...ids)', { ids: randomIds.map((r) => r.id) })
          .getMany();

    const mapped = questions
      .map((question) => {
        const translation = pickTranslation(question.translations ?? [], locale);
        if (!translation) return null;

        const answers: FlatQuizzAnswer[] = (question.answers ?? []).map((a) => {
          const answerTranslation = pickTranslation(a.translations ?? [], locale);
          return { id: a.id, text: answerTranslation?.text ?? '', isCorrect: a.isCorrect };
        });

        const flatQuestion: FlatQuizz = {
          id: question.id,
          mode: flattenMode(question.mode, locale),
          createdDate: question.createdDate,
          updatedDate: question.updatedDate,
          mentionedUserGender: null,
          question: translation.text,
          difficulty: question.difficulty,
          answers: shuffle(answers),
        };

        return { question: flatQuestion, questionType: 'quizz' as const, userTarget: null, userMentioned: null };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const customMapped = (dto.customQuestions ?? [])
      .filter((cq) => cq.type === 'quizz')
      .map((cq) => {
        const answers: FlatQuizzAnswer[] = shuffle([
          { id: crypto.randomUUID(), text: (cq as any).correctAnswer ?? '', isCorrect: true },
          ...((cq as any).wrongAnswers ?? []).map((w: string) => ({ id: crypto.randomUUID(), text: w, isCorrect: false })),
        ]);
        const fakeQuestion: FlatQuizz = {
          id: crypto.randomUUID(),
          question: cq.question!,
          difficulty: QuizzDifficulty.MEDIUM,
          mentionedUserGender: null,
          mode: null,
          createdDate: new Date(),
          updatedDate: new Date(),
          answers,
        };
        return { question: fakeQuestion, questionType: 'quizz' as const, userTarget: null, userMentioned: null };
      });

    return shuffle([...mapped, ...customMapped]);
  }
}
