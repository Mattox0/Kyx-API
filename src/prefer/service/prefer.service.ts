import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Mode } from '../../mode/entities/mode.entity.js';
import { Prefer } from '../entities/prefer.entity.js';
import { CreatePreferDto } from '../dto/create-prefer.dto.js';
import { ImportPreferItemDto } from '../dto/import-prefer.dto.js';
import { UpdatePreferDto } from '../dto/update-prefer.dto.js';
import { CreatePartyPreferDto } from '../dto/create-party-prefer.dto.js';

@Injectable()
export class PreferService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(page: number, limit: number, modeId?: string, search?: string) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('prefer')
      .from(Prefer, 'prefer')
      .leftJoinAndSelect('prefer.mode', 'mode');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    if (search) {
      qb.andWhere('(prefer.choiceOne ILIKE :search OR prefer.choiceTwo ILIKE :search OR CAST(prefer.id AS TEXT) ILIKE :search)', { search: `%${search}%` });
    }

    const [data, total] = await qb
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

  async findOne(id: string): Promise<Prefer | null> {
    return this.dataSource
      .createQueryBuilder()
      .select('prefer')
      .from(Prefer, 'prefer')
      .leftJoinAndSelect('prefer.mode', 'mode')
      .where('prefer.id = :id', { id })
      .getOne();
  }

  async create(dto: CreatePreferDto): Promise<Prefer> {
    try {
      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(Prefer)
        .values({
          choiceOne: dto.choiceOne,
          choiceTwo: dto.choiceTwo,
          mode: { id: dto.modeId },
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

  async update(id: string, dto: UpdatePreferDto): Promise<Prefer | null> {
    try {
      const updateData: Partial<Prefer> = {};

      if (dto.choiceOne !== undefined) {
        updateData.choiceOne = dto.choiceOne;
      }

      if (dto.choiceOne !== undefined) {
        updateData.choiceTwo = dto.choiceTwo;
      }

      if (dto.modeId !== undefined) {
        updateData.mode = { id: dto.modeId } as Mode;
      }

      if (Object.keys(updateData).length > 0) {
        await this.dataSource
          .createQueryBuilder()
          .update(Prefer)
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
      .from(Prefer)
      .where('id = :id', { id })
      .execute();
  }

  async exportAll(modeId?: string): Promise<Prefer[]> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('prefer')
      .from(Prefer, 'prefer')
      .leftJoinAndSelect('prefer.mode', 'mode');

    if (modeId) {
      qb.where('mode.id = :modeId', { modeId });
    }

    return qb.getMany();
  }

  async bulkCreate(items: ImportPreferItemDto[]): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(Prefer)
          .values({
            choiceOne: item.choiceOne,
            choiceTwo: item.choiceTwo,
            mode: { id: item.modeId },
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

  async createPartySolo(dto: CreatePartyPreferDto): Promise<Prefer[]> {
    return this.dataSource
      .createQueryBuilder()
      .select('prefer')
      .from(Prefer, 'prefer')
      .leftJoinAndSelect('prefer.mode', 'mode')
      .where('prefer.modeId IN (:...modeIds)', { modeIds: dto.modes })
      .orderBy('RANDOM()')
      .limit(100)
      .getMany();
  }
}
