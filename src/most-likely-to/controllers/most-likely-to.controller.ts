import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateMostLikelyToDto } from '../dto/create-most-likely-to.dto.js';
import { UpdateMostLikelyToDto } from '../dto/update-most-likely-to.dto.js';
import { ImportMostLikelyToDto } from '../dto/import-most-likely-to.dto.js';
import { MostLikelyToService } from '../service/most-likely-to.service.js';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard.js';
import { CreatePartyMostLikelyToDto, CreatePartyOnlineMostLikelyToDto } from '../dto/create-party-most-likely-to.dto.js';
import { CreateGameDto } from '../../game/dto/create-game.dto.js';
import { GameType } from '../../../types/enums/GameType.js';
import { AuthGuard, OptionalAuth, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { GameService } from '../../game/service/game.service.js';
import { detectLocale } from '../../config/languages.js';

@Controller('most-likely-to')
export class MostLikelyToController {
  constructor(
    private readonly mostLikelyToService: MostLikelyToService,
    private readonly gameService: GameService,
  ) {}

  @Post('')
  @UseGuards(AdminAuthGuard)
  async create(@Body() dto: CreateMostLikelyToDto) {
    return this.mostLikelyToService.create(dto);
  }

  @Get('translations/stats')
  @UseGuards(AdminAuthGuard)
  async getTranslationStats() {
    return this.mostLikelyToService.getTranslationStats();
  }

  @Get('')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('modeId') modeId?: string,
    @Query('search') search?: string,
    @Query('locale') locale?: string,
    @Query('locale_status') locale_status?: 'translated' | 'untranslated',
  ) {
    return this.mostLikelyToService.findAll(+(page ?? 1), +(limit ?? 50), modeId, search, locale, locale_status);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateMostLikelyToDto) {
    return this.mostLikelyToService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async remove(@Param('id') id: string): Promise<void> {
    return this.mostLikelyToService.remove(id);
  }

  @Get('export')
  @UseGuards(AdminAuthGuard)
  async export(@Query('modeId') modeId?: string) {
    return this.mostLikelyToService.exportAll(modeId);
  }

  @Post('import')
  @UseGuards(AdminAuthGuard)
  async import(@Body() dto: ImportMostLikelyToDto) {
    return this.mostLikelyToService.bulkCreate(dto.questions);
  }

  @Post('create-party/local')
  @UseGuards(AuthGuard)
  @OptionalAuth()
  async createPartyLocal(
    @Body() dto: CreatePartyMostLikelyToDto,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage: string = 'fr',
  ) {
    const locale = detectLocale(acceptLanguage);
    const createGame: CreateGameDto = {
      gameType: GameType.MOST_LIKELY_TO,
      modeIds: dto.modes,
      isLocal: true,
    };
    const game = await this.gameService.create(createGame, session?.user?.id);
    return { gameId: game.id, questions: await this.mostLikelyToService.createPartySolo(dto, locale) };
  }

  @Post('create-party/online')
  @UseGuards(AuthGuard)
  async createPartyOnline(
    @Body() dto: CreatePartyOnlineMostLikelyToDto,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage: string = 'fr',
  ) {
    const createGame: CreateGameDto = {
      gameType: GameType.MOST_LIKELY_TO,
      modeIds: dto.modes,
      isLocal: false,
    };
    const locale = detectLocale(acceptLanguage);
    const game = await this.gameService.create(createGame, session.user.id, locale);
    return { gameId: game.id, code: game.code };
  }
}
