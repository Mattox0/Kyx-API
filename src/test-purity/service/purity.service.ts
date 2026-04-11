import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Purity } from '../entities/purity.entity.js';
import { PurityTranslation } from '../entities/purity-translations.entity.js';
import { PurityAnswer } from '../entities/purity-answer.entity.js';
import { PurityAnswerTranslation } from '../entities/purity-answer-translation.entity.js';
import { CreatePurityDto } from '../dto/create-purity.dto.js';
import { UpdatePurityDto } from '../dto/update-purity.dto.js';
import { CalculatePurityScoreDto } from '../dto/calculate-purity-score.dto.js';
import { ImportPurityDto } from '../dto/import-purity.dto.js';
import { DEFAULT_LOCALE } from '../../config/languages.js';
import { ModeTranslation } from '../../mode/entities/mode-translation.entity.js';
import { Mode } from '../../mode/entities/mode.entity.js';

function pickTranslation<T extends { locale: string }>(translations: T[], locale: string): T | undefined {
  return translations.find((t) => t.locale === locale) ?? translations.find((t) => t.locale === DEFAULT_LOCALE);
}

function toQuestionTranslationsMap(translations: PurityTranslation[]): Record<string, { question: string }> {
  return Object.fromEntries(translations.map((t) => [t.locale, { question: t.question }]));
}

function toAnswerTranslationsMap(translations: PurityAnswerTranslation[]): Record<string, { text: string }> {
  return Object.fromEntries(translations.map((t) => [t.locale, { text: t.text }]));
}

function flattenPurity(purity: Purity) {
  return {
    ...purity,
    translations: toQuestionTranslationsMap(purity.translations ?? []),
    answers: (purity.answers ?? [])
      .sort((a, b) => a.position - b.position)
      .map((answer) => ({
        ...answer,
        translations: toAnswerTranslationsMap(answer.translations ?? []),
      })),
  };
}

@Injectable()
export class PurityService {
  constructor(private readonly dataSource: DataSource) {}

  private getBaseQuery() {
    return this.dataSource
      .createQueryBuilder()
      .select('purity')
      .from(Purity, 'purity')
      .leftJoinAndSelect('purity.mode', 'mode')
      .leftJoinAndSelect('mode.translations', 'modeTranslation')
      .leftJoinAndSelect('purity.translations', 'translation')
      .leftJoinAndSelect('purity.answers', 'answer')
      .leftJoinAndSelect('answer.translations', 'answerTranslation');
  }

  async findAll(page: number, limit: number, modeId?: string, search?: string) {
    const qb = this.getBaseQuery();

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    if (search) {
      qb.andWhere((qb2) => {
        const sub = qb2
          .subQuery()
          .select('1')
          .from(PurityTranslation, 'searchTrans')
          .where('searchTrans.purity = purity.id')
          .andWhere('searchTrans.question ILIKE :search')
          .getQuery();
        return `(EXISTS ${sub} OR CAST(purity.id AS TEXT) ILIKE :search)`;
      });
      qb.setParameter('search', `%${search}%`);
    }

    const [data, total] = await qb
      .orderBy('purity.position', 'ASC')
      .addOrderBy('purity.createdDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(flattenPurity),
      total,
      page,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };
  }

  async findOne(id: string) {
    const entity = await this.getBaseQuery()
      .where('purity.id = :id', { id })
      .getOne();

    if (!entity) return null;
    return flattenPurity(entity);
  }

  async findByMode(modeId: string) {
    const entities = await this.getBaseQuery()
      .where('mode.id = :modeId', { modeId })
      .orderBy('purity.position', 'ASC')
      .getMany();

    return entities.map(flattenPurity);
  }

  private async assertQuestionNotDuplicate(modeId: string, question: string, excludePurityId?: string): Promise<void> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('1')
      .from(PurityTranslation, 'pt')
      .innerJoin(Purity, 'p', 'p.id = pt.purityId')
      .where('p.modeId = :modeId', { modeId })
      .andWhere('pt.locale = :locale', { locale: DEFAULT_LOCALE })
      .andWhere('LOWER(pt.question) = LOWER(:question)', { question });

    if (excludePurityId) {
      qb.andWhere('p.id != :excludePurityId', { excludePurityId });
    }

    const exists = await qb.getRawOne();
    if (exists) {
      throw new ConflictException(`A question with this text already exists for this mode`);
    }
  }

  async create(dto: CreatePurityDto) {
    const frText = dto.translations[DEFAULT_LOCALE]?.question;
    if (frText?.trim()) {
      await this.assertQuestionNotDuplicate(dto.modeId, frText.trim());
    }

    try {
      const row = await this.dataSource
        .createQueryBuilder()
        .select('COALESCE(MAX(purity.position), -1)', 'maxPos')
        .from(Purity, 'purity')
        .where('purity.modeId = :modeId', { modeId: dto.modeId })
        .getRawOne<{ maxPos: number }>();

      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(Purity)
        .values({
          position: Number(row?.maxPos ?? -1) + 1,
          mode: { id: dto.modeId },
        })
        .returning('*')
        .execute();

      const purityId: string = result.raw[0].id;

      const translationsToInsert = Object.entries(dto.translations)
        .filter(([, val]) => val != null)
        .map(([locale, val]) => ({ purity: { id: purityId }, locale, question: val.question }));

      if (translationsToInsert.length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(PurityTranslation)
          .values(translationsToInsert)
          .execute();
      }

      if (dto.answers && dto.answers.length > 0) {
        const answerMaxRow = await this.dataSource
          .createQueryBuilder()
          .select('COALESCE(MAX(answer.position), -1)', 'maxPos')
          .from(PurityAnswer, 'answer')
          .where('answer.purityId = :purityId', { purityId })
          .getRawOne<{ maxPos: number }>();
        let nextAnswerPos = Number(answerMaxRow?.maxPos ?? -1) + 1;

        for (const answer of dto.answers) {
          const answerResult = await this.dataSource
            .createQueryBuilder()
            .insert()
            .into(PurityAnswer)
            .values({
              purity: { id: purityId },
              weight: answer.weight,
              skipCount: answer.skipCount ?? 0,
              position: nextAnswerPos++,
            })
            .returning('*')
            .execute();

          const answerId: string = answerResult.raw[0].id;

          const answerTranslations = Object.entries(answer.translations)
            .filter(([, val]) => val != null)
            .map(([locale, val]) => ({ answer: { id: answerId }, locale, text: val.text }));

          if (answerTranslations.length > 0) {
            await this.dataSource
              .createQueryBuilder()
              .insert()
              .into(PurityAnswerTranslation)
              .values(answerTranslations)
              .execute();
          }
        }
      }

      return this.findOne(purityId);
    } catch (error) {
      if (error.code === '23503') {
        throw new NotFoundException(`Mode with id "${dto.modeId}" not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePurityDto) {
    try {
      const updateData: Partial<Purity> = {};

      if (dto.modeId !== undefined) {
        updateData.mode = { id: dto.modeId } as any;
      }
      if (dto.position !== undefined) {
        updateData.position = dto.position;
      }

      if (Object.keys(updateData).length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .update(Purity)
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
                .from(PurityTranslation)
                .where('"purityId" = :id AND locale = :locale', { id, locale })
                .execute();
            }
          } else {
            await this.dataSource.getRepository(PurityTranslation).upsert(
              [{ purity: { id }, locale, question: val!.question!.trim() }],
              { conflictPaths: ['purity', 'locale'], skipUpdateIfNoValuesChanged: true },
            );
          }
        }
      }

      if (dto.answers) {
        for (const answer of dto.answers) {
          if (answer.id) {
            // Update existing answer
            const answerUpdate: any = {};
            if (answer.weight !== undefined) answerUpdate.weight = answer.weight;
            if (answer.skipCount !== undefined) answerUpdate.skipCount = answer.skipCount;
            if (answer.position !== undefined) answerUpdate.position = answer.position;

            if (Object.keys(answerUpdate).length > 0) {
              await this.dataSource
                .createQueryBuilder()
                .update(PurityAnswer)
                .set(answerUpdate)
                .where('id = :answerId', { answerId: answer.id })
                .execute();
            }

            if (answer.translations) {
              for (const [locale, val] of Object.entries(answer.translations)) {
                if (val === undefined) continue;

                const isEmpty = val === null || !(val.text ?? '').trim();
                if (isEmpty) {
                  await this.dataSource
                    .createQueryBuilder()
                    .delete()
                    .from(PurityAnswerTranslation)
                    .where('"answerId" = :answerId AND locale = :locale', { answerId: answer.id, locale })
                    .execute();
                } else {
                  await this.dataSource.getRepository(PurityAnswerTranslation).upsert(
                    [{ answer: { id: answer.id }, locale, text: val!.text!.trim() }],
                    { conflictPaths: ['answer', 'locale'], skipUpdateIfNoValuesChanged: true },
                  );
                }
              }
            }
          } else {
            // Create new answer — auto-assign position
            const answerMaxRow = await this.dataSource
              .createQueryBuilder()
              .select('COALESCE(MAX(a.position), -1)', 'maxPos')
              .from(PurityAnswer, 'a')
              .where('a.purityId = :purityId', { purityId: id })
              .getRawOne<{ maxPos: number }>();

            const answerResult = await this.dataSource
              .createQueryBuilder()
              .insert()
              .into(PurityAnswer)
              .values({
                purity: { id },
                weight: answer.weight ?? 0,
                skipCount: answer.skipCount ?? 0,
                position: Number(answerMaxRow?.maxPos ?? -1) + 1,
              })
              .returning('*')
              .execute();

            const answerId: string = answerResult.raw[0].id;

            if (answer.translations) {
              const answerTranslations = Object.entries(answer.translations)
                .filter(([, val]) => val != null && (val.text ?? '').trim())
                .map(([locale, val]) => ({ answer: { id: answerId }, locale, text: val!.text!.trim() }));

              if (answerTranslations.length > 0) {
                await this.dataSource
                  .createQueryBuilder()
                  .insert()
                  .into(PurityAnswerTranslation)
                  .values(answerTranslations)
                  .execute();
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

  async reorder(ids: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < ids.length; i++) {
        await manager
          .createQueryBuilder()
          .update(Purity)
          .set({ position: i })
          .where('id = :id', { id: ids[i] })
          .execute();
      }
    });
  }

  async reorderAnswers(ids: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < ids.length; i++) {
        await manager
          .createQueryBuilder()
          .update(PurityAnswer)
          .set({ position: i })
          .where('id = :id', { id: ids[i] })
          .execute();
      }
    });
  }

  async removeAnswer(answerId: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(PurityAnswer)
      .where('id = :answerId', { answerId })
      .execute();
  }

  async remove(id: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(Purity)
      .where('id = :id', { id })
      .execute();
  }

  async import(dto: ImportPurityDto): Promise<{ imported: number }> {
    const { modeId, questions } = dto;

    const frTextsInBatch = questions
      .map((q) => q.translations[DEFAULT_LOCALE]?.question?.trim().toLowerCase())
      .filter(Boolean) as string[];

    const duplicatesInBatch = frTextsInBatch.filter((t, i) => frTextsInBatch.indexOf(t) !== i);
    if (duplicatesInBatch.length > 0) {
      throw new ConflictException(`Duplicate questions in the import batch: "${duplicatesInBatch[0]}"`);
    }

    for (const question of questions) {
      const frText = question.translations[DEFAULT_LOCALE]?.question?.trim();
      if (frText) {
        await this.assertQuestionNotDuplicate(modeId, frText);
      }
    }

    const row = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(MAX(purity.position), -1)', 'maxPos')
      .from(Purity, 'purity')
      .where('purity.modeId = :modeId', { modeId })
      .getRawOne<{ maxPos: number }>();

    let nextPosition = Number(row?.maxPos ?? -1) + 1;

    for (const question of questions) {
      const purityResult = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(Purity)
        .values({ position: nextPosition++, mode: { id: modeId } })
        .returning('*')
        .execute();

      const purityId: string = purityResult.raw[0].id;

      const translationsToInsert = Object.entries(question.translations)
        .filter(([, val]) => val?.question?.trim())
        .map(([locale, val]) => ({ purity: { id: purityId }, locale, question: val.question.trim() }));

      if (translationsToInsert.length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(PurityTranslation)
          .values(translationsToInsert)
          .execute();
      }

      if (question.answers && question.answers.length > 0) {
        let nextAnswerPos = 0;

        for (const answer of question.answers) {
          const answerResult = await this.dataSource
            .createQueryBuilder()
            .insert()
            .into(PurityAnswer)
            .values({ purity: { id: purityId }, weight: answer.weight, position: nextAnswerPos++ })
            .returning('*')
            .execute();

          const answerId: string = answerResult.raw[0].id;

          const answerTranslations = Object.entries(answer.translations)
            .filter(([, val]) => val?.text?.trim())
            .map(([locale, val]) => ({ answer: { id: answerId }, locale, text: val.text.trim() }));

          if (answerTranslations.length > 0) {
            await this.dataSource
              .createQueryBuilder()
              .insert()
              .into(PurityAnswerTranslation)
              .values(answerTranslations)
              .execute();
          }
        }
      }
    }

    return { imported: questions.length };
  }

  async calculateScore(dto: CalculatePurityScoreDto, locale: string) {
    const { modeIds, answers } = dto;

    const entities = await this.getBaseQuery()
      .where('mode.id IN (:...modeIds)', { modeIds })
      .getMany();

    const answerWeightMap = new Map<string, number>();
    for (const purity of entities) {
      for (const answer of purity.answers ?? []) {
        answerWeightMap.set(answer.id, answer.weight);
      }
    }

    const chosenAnswerMap = new Map<string, string>();
    for (const a of answers) {
      chosenAnswerMap.set(a.questionId, a.answerId);
    }

    type ModeEntry = { mode: Mode & { translations: ModeTranslation[] }; questions: Purity[] };
    const themeMap = new Map<string, ModeEntry>();
    for (const purity of entities) {
      const mode = purity.mode as Mode & { translations: ModeTranslation[] };
      if (!themeMap.has(mode.id)) {
        themeMap.set(mode.id, { mode, questions: [] });
      }
      themeMap.get(mode.id)!.questions.push(purity);
    }

    let globalMaxScore = 0;
    let globalUserScore = 0;

    const modes = modeIds
      .filter((id) => themeMap.has(id))
      .map((id) => {
        const { mode, questions } = themeMap.get(id)!;
        const { translations, ...modeRest } = mode;
        const t = pickTranslation(translations, locale);

        let maxScore = 0;
        let userScore = 0;

        for (const question of questions) {
          const weights = (question.answers ?? []).map((a) => a.weight);
          const questionMax = weights.length > 0 ? Math.max(...weights) : 0;
          maxScore += questionMax;

          const chosenAnswerId = chosenAnswerMap.get(question.id);
          if (chosenAnswerId !== undefined) {
            userScore += answerWeightMap.get(chosenAnswerId) ?? 0;
          }
        }

        globalMaxScore += maxScore;
        globalUserScore += userScore;

        const purityPercent = maxScore === 0
          ? 100
          : Math.min(100, Math.max(0, Math.round((1 - userScore / maxScore) * 100)));

        return {
          modeId: modeRest.id,
          modeName: t?.name ?? '',
          purityPercent,
          score: userScore,
          maxScore,
        };
      });

    const globalPurityPercent = globalMaxScore === 0
      ? 100
      : Math.min(100, Math.max(0, Math.round((1 - globalUserScore / globalMaxScore) * 100)));

    return { globalPurityPercent, modes };
  }

  async startTest(modeIds: string[], locale: string) {
    const entities = await this.getBaseQuery()
      .where('mode.id IN (:...modeIds)', { modeIds })
      .orderBy('purity.position', 'ASC')
      .addOrderBy('answer.position', 'ASC')
      .getMany();

    type QuestionItem = { id: string; position: number; question: string; answers: { id: string; weight: number; skipCount: number; position: number; text: string }[] };
    const themeMap = new Map<string, { mode: Mode & { translations: ModeTranslation[] }; questions: QuestionItem[] }>();

    for (const purity of entities) {
      const mode = purity.mode as Mode & { translations: ModeTranslation[] };
      if (!themeMap.has(mode.id)) {
        themeMap.set(mode.id, { mode, questions: [] });
      }

      const questionText = pickTranslation(purity.translations ?? [], locale)?.question ?? '';

      const answers = (purity.answers ?? [])
        .sort((a, b) => a.position - b.position)
        .map((answer) => ({
          id: answer.id,
          weight: answer.weight,
          skipCount: answer.skipCount,
          position: answer.position,
          text: pickTranslation(answer.translations ?? [], locale)?.text ?? '',
        }));

      themeMap.get(mode.id)!.questions.push({
        id: purity.id,
        position: purity.position,
        question: questionText,
        answers,
      });
    }

    return modeIds
      .filter((id) => themeMap.has(id))
      .map((id) => {
        const { mode, questions } = themeMap.get(id)!;
        const { translations, ...modeRest } = mode;
        const t = pickTranslation(translations, locale);
        return {
          mode: { ...modeRest, name: t?.name ?? '', description: t?.description ?? '' },
          questions,
        };
      });
  }
}
