import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Mode } from '../entities/mode.entity.js';
import { ModeTranslation } from '../entities/mode-translation.entity.js';
import { CreateModeDto } from '../dto/create-mode.dto.js';
import { UpdateModeDto } from '../dto/update-mode.dto.js';
import { GameType } from '../../../types/enums/GameType.js';
import { DEFAULT_LOCALE } from '../../config/languages.js';

function toTranslationsMap(translations: ModeTranslation[]): Record<string, { name: string; description: string }> {
  return Object.fromEntries(translations.map((t) => [t.locale, { name: t.name, description: t.description }]));
}

@Injectable()
export class ModeService {
  constructor(private readonly dataSource: DataSource) {}

  async create(dto: CreateModeDto, iconPath?: string): Promise<object | null> {
    const row = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(MAX(mode.position), -1)', 'maxPos')
      .from(Mode, 'mode')
      .where('mode.gameType = :gameType', { gameType: dto.gameType })
      .getRawOne<{ maxPos: number }>();

    const result = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(Mode)
      .values({
        gameType: dto.gameType,
        icon: iconPath ?? undefined,
        position: Number(row?.maxPos ?? -1) + 1,
      })
      .returning('*')
      .execute();

    const id: string = result.raw[0].id;

    const translationsToInsert = Object.entries(dto.translations)
      .filter(([, val]) => val != null)
      .map(([locale, val]) => ({ mode: { id }, locale, name: val.name, description: val.description }));

    if (translationsToInsert.length > 0) {
      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(ModeTranslation)
        .values(translationsToInsert)
        .execute();
    }

    return this.findOne(id);
  }

  async findAll(): Promise<object[]> {
    const modes = await this.dataSource
      .createQueryBuilder()
      .select('mode')
      .from(Mode, 'mode')
      .leftJoinAndSelect('mode.translations', 'translation')
      .orderBy('mode.gameType', 'ASC')
      .addOrderBy('mode.position', 'ASC')
      .getMany();

    return modes.map((m) => ({ ...m, translations: toTranslationsMap(m.translations ?? []) }));
  }

  async findOne(id: string): Promise<object | null> {
    const mode = await this.dataSource
      .createQueryBuilder()
      .select('mode')
      .from(Mode, 'mode')
      .leftJoinAndSelect('mode.translations', 'translation')
      .where('mode.id = :id', { id })
      .getOne();

    if (!mode) return null;
    return { ...mode, translations: toTranslationsMap(mode.translations ?? []) };
  }

  async findByGame(gameName: string, locale: string): Promise<object[]> {
    const gameTypeMap: Record<string, GameType> = {
      'never-have': GameType.NEVER_HAVE,
      'prefer': GameType.PREFER,
      'truth-dare': GameType.TRUTH_DARE,
    };

    const gameType = gameTypeMap[gameName];
    if (!gameType) {
      throw new NotFoundException(`Game type "${gameName}" not found`);
    }

    const modes = await this.dataSource
      .createQueryBuilder()
      .select('mode')
      .from(Mode, 'mode')
      .leftJoinAndSelect('mode.translations', 'translation')
      .where('mode.gameType = :gameType', { gameType })
      .orderBy('mode.position', 'ASC')
      .getMany();

    return modes.map((m) => {
      const translations = m.translations ?? [];
      const translation = translations.find((t) => t.locale === locale)
        ?? translations.find((t) => t.locale === DEFAULT_LOCALE);
      return {
        id: m.id,
        createdDate: m.createdDate,
        translations: toTranslationsMap(translations),
        icon: m.icon,
        gameType: m.gameType,
        position: m.position,
        name: translation?.name ?? null,
        description: translation?.description ?? null,
      };
    });
  }

  async update(id: string, dto: UpdateModeDto, iconPath?: string): Promise<object | null> {
    const updateData: Partial<Mode> = {};
    if (dto.gameType !== undefined) updateData.gameType = dto.gameType;
    if (iconPath !== undefined) (updateData as any).icon = iconPath;

    if (Object.keys(updateData).length > 0) {
      await this.dataSource
        .createQueryBuilder()
        .update(Mode)
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
            .from(ModeTranslation)
            .where('"modeId" = :id AND locale = :locale', { id, locale })
            .execute();
        } else {
          await this.dataSource.getRepository(ModeTranslation).upsert(
            [{ mode: { id }, locale, name: val.name, description: val.description }],
            { conflictPaths: ['mode', 'locale'], skipUpdateIfNoValuesChanged: true },
          );
        }
      }
    }

    return this.findOne(id);
  }

  async reorder(ids: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < ids.length; i++) {
        await manager
          .createQueryBuilder()
          .update(Mode)
          .set({ position: i })
          .where('id = :id', { id: ids[i] })
          .execute();
      }
    });
  }

  async remove(id: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(Mode)
      .where('id = :id', { id })
      .execute();
  }
}
