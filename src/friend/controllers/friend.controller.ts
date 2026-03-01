import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Friend } from '../entities/friend.entity.js';
import { FriendService } from '../service/friend.service.js';
import { RequestFriendDto } from '../dto/request-friend.dto.js';
import {
  AuthGuard,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';

@UseGuards(AuthGuard)
@Controller('friend')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get()
  async findAll(@Session() session: UserSession) {
    return this.friendService.findAllFriends(session.user.id);
  }

  @Get("/request/sent")
  async sentRequests(@Session() session: UserSession) {
    return this.friendService.findSentRequests(session.user.id);
  }

  @Get("/request/received")
  async receivedRequests(@Session() session: UserSession) {
    return this.friendService.findReceivedRequests(session.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Friend | null> {
    return this.friendService.findOne(id);
  }

  @Post("/request")
  async request(@Body() dto: RequestFriendDto, @Session() session: UserSession) {
    return this.friendService.createRequest(dto, session.user.id);
  }

  @Post("/request/:id/accept")
  async requestAccept(@Param('id') id: string, @Session() session: UserSession) {
    const friendRequest = await this.friendService.findFriendRequest(id);
    if (!friendRequest) {
      throw new NotFoundException(`Request not found`);
    }
    console.log(friendRequest);
    console.log(session.user.id);
    if (friendRequest.userRequested.id !== session.user.id) {
      throw new BadRequestException(`You can't accept this request`);
    }
    return this.friendService.acceptRequest(friendRequest);
  }

  @Post("/request/:id/decline")
  async requestDecline(@Param('id') id: string, @Session() session: UserSession) {
    const friendRequest = await this.friendService.findFriendRequest(id);
    if (!friendRequest) {
      throw new NotFoundException(`Request not found`);
    }
    if (friendRequest.userRequested.id !== session.user.id) {
      throw new BadRequestException(`You can't decline this request`);
    }
    return this.friendService.declineRequest(friendRequest);
  }
}
