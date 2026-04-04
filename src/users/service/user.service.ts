import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { Friend } from '../../friend/entities/friend.entity.js';

@Injectable()
export class UserService {
  constructor(private readonly dataSource: DataSource) {}

  async checkEmailAvailable(email: string): Promise<boolean> {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('1')
      .from(User, 'user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getRawOne();
    return !result;
  }

  async checkNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('1')
      .from(User, 'user')
      .where('LOWER(user.name) = LOWER(:name)', { name })
      .andWhere('user.name IS NOT NULL');

    if (excludeId) {
      qb.andWhere('user.id != :excludeId', { excludeId });
    }

    const result = await qb.getRawOne();
    return !result;
  }

  async findAll(page: number, limit: number, search?: string, hasDeviceToken?: boolean) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('user')
      .from(User, 'user');

    if (hasDeviceToken) {
      qb.innerJoin('device_token', 'dt', 'dt."userId" = user.id');
    }

    if (search) {
      qb.where(
        '(user.name ILIKE :search OR user.email ILIKE :search OR CAST(user.id AS TEXT) ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [users, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const userIds = users.map((u) => u.id);

    const [friendRows, sessionRows]: [
      { userId: string; friendId: string }[],
      { userId: string; lastConnectedAt: Date }[],
    ] = await Promise.all([
      userIds.length
        ? this.dataSource
            .createQueryBuilder()
            .select(['f.userId', 'f.friendId'])
            .from(Friend, 'f')
            .where('f.userId IN (:...ids) OR f.friendId IN (:...ids)', { ids: userIds })
            .getRawMany()
        : Promise.resolve([]),
      userIds.length
        ? this.dataSource
            .createQueryBuilder()
            .select('s."userId"', 'userId')
            .addSelect('MAX(s."createdAt")', 'lastConnectedAt')
            .from('session', 's')
            .where('s."userId" IN (:...ids)', { ids: userIds })
            .groupBy('s."userId"')
            .getRawMany()
        : Promise.resolve([]),
    ]);

    const countMap = new Map<string, number>();
    for (const row of friendRows) {
      countMap.set(row.userId, (countMap.get(row.userId) ?? 0) + 1);
      countMap.set(row.friendId, (countMap.get(row.friendId) ?? 0) + 1);
    }

    const lastConnectedMap = new Map<string, Date>();
    for (const row of sessionRows) {
      lastConnectedMap.set(row.userId, row.lastConnectedAt);
    }

    const data = users.map((user) => ({
      ...user,
      friendCount: countMap.get(user.id) ?? 0,
      lastConnectedAt: lastConnectedMap.get(user.id) ?? null,
    }));

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

  async findOne(id: string): Promise<(User & { lastConnectedAt: Date | null }) | null> {
    const [user, sessionRow] = await Promise.all([
      this.dataSource
        .createQueryBuilder()
        .select('user')
        .from(User, 'user')
        .where('user.id = :id', { id })
        .getOne(),
      this.dataSource
        .createQueryBuilder()
        .select('MAX(s."createdAt")', 'lastConnectedAt')
        .from('session', 's')
        .where('s."userId" = :id', { id })
        .getRawOne(),
    ]);

    if (!user) return null;
    return { ...user, lastConnectedAt: sessionRow?.lastConnectedAt ?? null };
  }

  async update(id: string, dto: UpdateUserDto): Promise<User | null> {
    const updateData: Partial<User> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.image !== undefined) updateData.image = dto.image;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.avatarOptions !== undefined) updateData.avatarOptions = dto.avatarOptions;
    if (dto.locale !== undefined) updateData.locale = dto.locale;

    if (Object.keys(updateData).length > 0) {
      await this.dataSource
        .createQueryBuilder()
        .update(User)
        .set(updateData)
        .where('id = :id', { id })
        .execute();
    }

    return this.findOne(id);
  }

  async addCoins(id: string, amount: number): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(User)
      .set({ coins: () => `coins + ${amount}` })
      .where('id = :id', { id })
      .execute();
  }

  async remove(id: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(User)
      .where('id = :id', { id })
      .execute();
  }
}
