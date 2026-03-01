import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Friend } from '../entities/friend.entity.js';
import { RequestFriendDto } from '../dto/request-friend.dto.js';
import { FriendRequest } from '../entities/friend-request.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Injectable()
export class FriendService {
  constructor(private readonly dataSource: DataSource) {}

  async createRequest(dto: RequestFriendDto, userId: string) {
    const userRequested = await this.dataSource
      .createQueryBuilder()
      .select('user')
      .from(User, 'user')
      .where('user.friendCode = :friendCode', { friendCode: dto.friendCode })
      .getOne();

    if (!userRequested) {
      throw new NotFoundException(`User not found`);
    }

    const result = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(FriendRequest)
      .values({
        user: { id: userId },
        userRequested: { id: userRequested.id },
      })
      .returning('*')
      .execute();

    return result.raw[0];
  }

  async findAllFriends(userId: string): Promise<Friend[]> {
    const friends = await this.dataSource
      .createQueryBuilder()
      .select('friend')
      .from(Friend, 'friend')
      .leftJoinAndSelect('friend.user', 'user')
      .leftJoinAndSelect('friend.friend', 'userFriend')
      .where('friend.userId = :userId OR friend.friendId = :userId', { userId })
      .getMany();

    return friends.map((f) => {
      if (f.friend.id === userId) {
        return { ...f, user: f.friend, friend: f.user } as Friend;
      }
      return f;
    });
  }

  async findOne(id: string): Promise<Friend | null> {
    return this.dataSource
      .createQueryBuilder()
      .select('friend')
      .from(Friend, 'friend')
      .where('friend.id = :id', { id })
      .getOne();
  }

  async findReceivedRequests(userId: string): Promise<FriendRequest[]> {
    return this.dataSource
      .createQueryBuilder()
      .select('friendRequest')
      .from(FriendRequest, 'friendRequest')
      .leftJoinAndSelect('friendRequest.user', 'user')
      .leftJoinAndSelect('friendRequest.userRequested', 'userRequested')
      .where('friendRequest.friendId = :userId', { userId })
      .getMany();
  }

  async findSentRequests(userId: string): Promise<FriendRequest[]> {
    return this.dataSource
      .createQueryBuilder()
      .select('friendRequest')
      .from(FriendRequest, 'friendRequest')
      .leftJoinAndSelect("friendRequest.user", 'user')
      .leftJoinAndSelect("friendRequest.userRequested", 'userRequested')
      .where('friendRequest.userId = :userId', { userId })
      .getMany();
  }

  async findFriendRequest(id: string): Promise<FriendRequest | null> {
    return this.dataSource
      .createQueryBuilder()
      .select('friendRequest')
      .from(FriendRequest, 'friendRequest')
      .leftJoinAndSelect("friendRequest.user", 'user')
      .leftJoinAndSelect("friendRequest.userRequested", 'userRequested')
      .where('friendRequest.id = :id', { id })
      .getOne();
  }

  async acceptRequest(friendRequest: FriendRequest): Promise<Friend> {
    return this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(Friend)
        .values({
          user: { id: friendRequest.user.id },
          friend: { id: friendRequest.userRequested.id },
        })
        .returning('*')
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(FriendRequest)
        .where('id = :id', { id: friendRequest.id })
        .execute();

      return result.raw[0];
    });
  }

  async declineRequest(friendRequest: FriendRequest): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(FriendRequest)
      .where('id = :id', { id: friendRequest.id })
      .execute();
  }
}