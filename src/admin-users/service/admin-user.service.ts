import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../entities/admin-user.entity.js';
import { CreateAdminUserDto } from '../dto/create-admin-user.dto.js';
import { UpdateAdminUserDto } from '../dto/update-admin-user.dto.js';

@Injectable()
export class AdminUserService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(page: number, limit: number, search?: string) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('adminUser')
      .from(AdminUser, 'adminUser');

    if (search) {
      qb.where(
        'adminUser.name ILIKE :search OR adminUser.email ILIKE :search OR CAST(adminUser.id AS TEXT) ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('adminUser.createdAt', 'DESC')
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

  async findOne(id: string): Promise<AdminUser | null> {
    return this.dataSource
      .createQueryBuilder()
      .select('adminUser')
      .from(AdminUser, 'adminUser')
      .where('adminUser.id = :id', { id })
      .getOne();
  }

  async findByEmailAndPassword(email: string): Promise<AdminUser | null> {
    return this.dataSource
      .getRepository(AdminUser)
      .createQueryBuilder('admin')
      .where('admin.email = :email', { email })
      .addSelect('admin.password')
      .getOne();
  }

  async create(dto: CreateAdminUserDto): Promise<AdminUser> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const result = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(AdminUser)
      .values({
        displayName: dto.displayName,
        email: dto.email,
        password: hashedPassword,
      })
      .returning('*')
      .execute();

    const user = result.raw[0];
    delete user.password;
    return user;
  }

  async update(id: string, dto: UpdateAdminUserDto): Promise<AdminUser | null> {
    const updateData = { ...dto };

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    if (Object.keys(updateData).length > 0) {
      await this.dataSource
        .createQueryBuilder()
        .update(AdminUser)
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
      .from(AdminUser)
      .where('id = :id', { id })
      .execute();
  }
}
