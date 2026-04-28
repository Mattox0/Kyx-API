import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Report } from '../entities/report.entity.js';
import { CreateReportDto } from '../dto/create-report.dto.js';
import { UpdateReportDto } from '../dto/update-report.dto.js';
import { TruthDare } from '../../truth-dare/entities/truth-dare.entity.js';
import { NeverHave } from '../../never-have/entities/never-have.entity.js';
import { Prefer } from '../../prefer/entities/prefer.entity.js';
import { MostLikelyTo } from '../../most-likely-to/entities/most-likely-to.entity.js';
import { TenBut } from '../../ten-but/entities/ten-but.entity.js';
import { QuizzQuestion } from '../../quizz/entities/quizz-question.entity.js';

@Injectable()
export class ReportService {
  constructor(private readonly dataSource: DataSource) {}

  private async resolveQuestion(questionId: string): Promise<{ truthDare?: { id: string }; neverHave?: { id: string }; prefer?: { id: string }; mostLikelyTo?: { id: string }; tenBut?: { id: string }; quizzQuestion?: { id: string } }> {
    const truthDare = await this.dataSource.getRepository(TruthDare).findOne({ where: { id: questionId } });
    if (truthDare) return { truthDare: { id: questionId } };

    const neverHave = await this.dataSource.getRepository(NeverHave).findOne({ where: { id: questionId } });
    if (neverHave) return { neverHave: { id: questionId } };

    const prefer = await this.dataSource.getRepository(Prefer).findOne({ where: { id: questionId } });
    if (prefer) return { prefer: { id: questionId } };

    const mostLikelyTo = await this.dataSource.getRepository(MostLikelyTo).findOne({ where: { id: questionId } });
    if (mostLikelyTo) return { mostLikelyTo: { id: questionId } };

    const tenBut = await this.dataSource.getRepository(TenBut).findOne({ where: { id: questionId } });
    if (tenBut) return { tenBut: { id: questionId } };

    const quizzQuestion = await this.dataSource.getRepository(QuizzQuestion).findOne({ where: { id: questionId } });
    if (quizzQuestion) return { quizzQuestion: { id: questionId } };

    throw new NotFoundException(`Question ${questionId} not found`);
  }

  async findAll(page: number, limit: number, search?: string, resolved?: boolean) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('report')
      .from(Report, 'report')
      .leftJoinAndSelect('report.truthDare', 'truthDare')
      .leftJoinAndSelect('report.neverHave', 'neverHave')
      .leftJoinAndSelect('report.prefer', 'prefer')
      .leftJoinAndSelect('report.mostLikelyTo', 'mostLikelyTo')
      .leftJoinAndSelect('report.tenBut', 'tenBut')
      .leftJoinAndSelect('report.quizzQuestion', 'quizzQuestion')
      .leftJoinAndSelect('report.user', 'user');

    if (search) {
      qb.where('(report.comment ILIKE :search OR CAST(report.id AS TEXT) ILIKE :search)', { search: `%${search}%` });
    }

    if (resolved !== undefined) {
      qb.andWhere('report.resolved = :resolved', { resolved });
    }

    const [data, total] = await qb
      .orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };
  }

  async findOne(id: string): Promise<Report | null> {
    return this.dataSource
      .createQueryBuilder()
      .select('report')
      .from(Report, 'report')
      .leftJoinAndSelect('report.truthDare', 'truthDare')
      .leftJoinAndSelect('report.neverHave', 'neverHave')
      .leftJoinAndSelect('report.prefer', 'prefer')
      .leftJoinAndSelect('report.mostLikelyTo', 'mostLikelyTo')
      .leftJoinAndSelect('report.tenBut', 'tenBut')
      .leftJoinAndSelect('report.quizzQuestion', 'quizzQuestion')
      .leftJoinAndSelect('report.user', 'user')
      .where('report.id = :id', { id })
      .getOne();
  }

  async create(dto: CreateReportDto, userId?: string): Promise<Report> {
    const questionRelation = dto.questionId ? await this.resolveQuestion(dto.questionId) : {};

    const result = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(Report)
      .values({
        comment: dto.comment,
        reason: dto.reason,
        ...( userId && { user: { id: userId } }),
        ...questionRelation,
      })
      .returning('*')
      .execute();

    return result.raw[0];
  }

  async update(id: string, dto: UpdateReportDto): Promise<Report | null> {
    const updateData: any = {};

    if (dto.comment !== undefined) updateData.comment = dto.comment;
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.resolved !== undefined) updateData.resolved = dto.resolved;

    if (dto.questionId !== undefined) {
      const questionRelation = await this.resolveQuestion(dto.questionId);
      updateData.truthDare = null;
      updateData.neverHave = null;
      updateData.prefer = null;
      updateData.mostLikelyTo = null;
      updateData.tenBut = null;
      updateData.quizzQuestion = null;
      Object.assign(updateData, questionRelation);
    }

    if (Object.keys(updateData).length > 0) {
      await this.dataSource
        .createQueryBuilder()
        .update(Report)
        .set(updateData)
        .where('id = :id', { id })
        .execute();
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(Report)
      .where('id = :id', { id })
      .execute();
  }
}
