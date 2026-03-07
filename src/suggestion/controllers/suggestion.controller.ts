import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query, UseGuards,
} from '@nestjs/common';
import { SuggestionService } from '../service/suggestion.service.js';
import { Suggestion } from '../entities/suggestion.entity.js';
import { CreateSuggestionDto } from '../dto/create-suggestion.dto.js';
import { UpdateSuggestionDto } from '../dto/update-suggestion.dto.js';
import {
  AuthGuard,
  OptionalAuth,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard.js';

@Controller('suggestion')
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) {}

  @Post()
  @UseGuards(AuthGuard)
  @OptionalAuth()
  async createSuggestion(@Body() dto: CreateSuggestionDto, @Session() session: UserSession): Promise<Suggestion> {
    return this.suggestionService.create(dto, session?.user?.id);
  }

  @Get()
  @UseGuards(AdminAuthGuard)
  async findAllSuggestions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('resolved') resolved?: string,
    @Query('search') search?: string,
  ) {
    return this.suggestionService.findAll(+(page ?? 1), +(limit ?? 50), resolved, search);
  }

  @Get(':id')
  @UseGuards(AdminAuthGuard)
  async findOneSuggestion(@Param('id') id: string): Promise<Suggestion | null> {
    return this.suggestionService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  async updateSuggestion(
    @Param('id') id: string,
    @Body() dto: UpdateSuggestionDto,
  ): Promise<Suggestion | null> {
    return this.suggestionService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async deleteSuggestion(@Param('id') id: string): Promise<void> {
    return this.suggestionService.remove(id);
  }
}
