import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Mode } from '../../mode/entities/mode.entity.js';
import { TruthDare } from '../entities/truth-dare.entity.js';
import { CreateTruthDareDto } from '../dto/create-truth-dare.dto.js';
import { ImportTruthDareItemDto } from '../dto/import-truth-dare.dto.js';
import { UpdateTruthDareDto } from '../dto/update-truth-dare.dto.js';
import { CreatePartyTruthDareDto, UserSoloItemDto } from '../dto/create-party-truth-dare.dto.js';
import { Gender } from '../../../types/enums/Gender.js';

@Injectable()
export class TruthDareService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(page: number, limit: number, modeId?: string, search?: string) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('truthDare')
      .from(TruthDare, 'truthDare')
      .leftJoinAndSelect('truthDare.mode', 'mode');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    if (search) {
      qb.andWhere('(truthDare.question ILIKE :search OR CAST(truthDare.id AS TEXT) ILIKE :search)', { search: `%${search}%` });
    }

    const [data, total] = await qb
      .orderBy('truthDare.createdDate', 'DESC')
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

  async findOne(id: string): Promise<TruthDare | null> {
    return this.dataSource
      .createQueryBuilder()
      .select('truthDare')
      .from(TruthDare, 'truthDare')
      .leftJoinAndSelect('truthDare.mode', 'mode')
      .where('truthDare.id = :id', { id })
      .getOne();
  }

  async create(dto: CreateTruthDareDto): Promise<TruthDare> {
    try {
      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(TruthDare)
        .values({
          question: dto.question,
          gender: dto.gender,
          type: dto.type,
          mode: { id: dto.modeId },
          mentionedUserGender: dto.mentionedUserGender ?? null,
        })
        .returning('*')
        .execute();

      return result.raw[0];
    } catch (error) {
      if (error.code === '23503') {
        throw new NotFoundException(`Mode with id "${dto.modeId}" not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTruthDareDto): Promise<TruthDare | null> {
    try {
      const updateData: Partial<TruthDare> = {};

      if (dto.question !== undefined) {
        updateData.question = dto.question;
      }

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
          .where('id = :id', { id: id })
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

  async remove(id: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(TruthDare)
      .where('id = :id', { id })
      .execute();
  }

  async exportAll(modeId?: string): Promise<TruthDare[]> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('truthDare')
      .from(TruthDare, 'truthDare')
      .leftJoinAndSelect('truthDare.mode', 'mode');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    return qb.getMany();
  }

  async bulkCreate(items: ImportTruthDareItemDto[]): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(TruthDare)
          .values({
            question: item.question,
            gender: item.gender,
            type: item.type,
            mode: { id: item.modeId },
            mentionedUserGender: item.mentionedUserGender ?? null,
          })
          .execute();
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

  async createPartySolo(dto: CreatePartyTruthDareDto): Promise<{ question: TruthDare; questionType: string; userTarget: UserSoloItemDto; userMentioned: UserSoloItemDto | null }[]> {
    const hasMen = dto.users.some((u) => u.gender === Gender.MAN);
    const hasWomen = dto.users.some((u) => u.gender === Gender.FEMALE);

    const allowedGenders: Gender[] = [Gender.ALL];
    if (hasMen) allowedGenders.push(Gender.MAN);
    if (hasWomen) allowedGenders.push(Gender.FEMALE);

    const allowedMentionedGenders: Gender[] = [Gender.ALL];
    if (hasMen) allowedMentionedGenders.push(Gender.MAN);
    if (hasWomen) allowedMentionedGenders.push(Gender.FEMALE);

    const questions = await this.dataSource
      .createQueryBuilder()
      .select('truthDare')
      .from(TruthDare, 'truthDare')
      .leftJoinAndSelect('truthDare.mode', 'mode')
      .where('truthDare.modeId IN (:...modeIds)', { modeIds: dto.modes })
      .andWhere('truthDare.gender IN (:...genders)', { genders: allowedGenders })
      .andWhere('(truthDare.mentionedUserGender IS NULL OR truthDare.mentionedUserGender IN (:...allowedMentionedGenders))', { allowedMentionedGenders })
      .orderBy('RANDOM()')
      .limit(50)
      .getMany();

    const menUsers = dto.users.filter((u) => u.gender === Gender.MAN);
    const womenUsers = dto.users.filter((u) => u.gender === Gender.FEMALE);

    const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    return questions.map((question) => {
      const eligibleTargets =
        question.gender === Gender.MAN ? menUsers :
        question.gender === Gender.FEMALE ? womenUsers :
        dto.users;

      const userTarget = pickRandom(eligibleTargets);

      let userMentioned: UserSoloItemDto | null = null;
      if (question.mentionedUserGender !== null) {
        const mentionedPool = dto.users.filter((u) => u !== userTarget && (
          question.mentionedUserGender === Gender.ALL || u.gender === question.mentionedUserGender
        ));
        const fallbackPool = dto.users.filter((u) => u !== userTarget);
        const pool = mentionedPool.length > 0 ? mentionedPool : fallbackPool;
        userMentioned = pool.length > 0 ? pickRandom(pool) : null;
      }

      return { question, questionType: 'truth-dare' as const, userTarget, userMentioned };
    });
  }
}
