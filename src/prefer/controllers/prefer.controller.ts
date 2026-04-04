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
import { CreatePreferDto } from '../dto/create-prefer.dto.js';
import { ImportPreferDto } from '../dto/import-prefer.dto.js';
import { PreferService } from '../service/prefer.service.js';
import { UpdatePreferDto } from '../dto/update-prefer.dto.js';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard.js';
import { CreatePartyPreferDto, CreatePartyOnlinePreferDto } from '../dto/create-party-prefer.dto.js';
import { CreateGameDto } from '../../game/dto/create-game.dto.js';
import { GameType } from '../../../types/enums/GameType.js';
import { AuthGuard, OptionalAuth, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { GameService } from '../../game/service/game.service.js';
import { detectLocale } from '../../config/languages.js';

@Controller('prefer')
export class PreferController {
  constructor(private readonly preferService: PreferService, private readonly gameService: GameService) {}

  @Post('')
  @UseGuards(AdminAuthGuard)
  async createPrefer(@Body() dto: CreatePreferDto) {
    return this.preferService.create(dto);
  }

  @Get('translations/stats')
  @UseGuards(AdminAuthGuard)
  async getPreferTranslationStats() {
    return this.preferService.getTranslationStats();
  }

  @Get('')
  async findAllPrefer(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('modeId') modeId?: string,
    @Query('search') search?: string,
    @Query('locale') locale?: string,
    @Query('locale_status') locale_status?: 'translated' | 'untranslated',
  ) {
    return this.preferService.findAll(+(page ?? 1), +(limit ?? 50), modeId, search, locale, locale_status);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  async updatePrefer(@Param('id') id: string, @Body() dto: UpdatePreferDto) {
    return this.preferService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async deletePrefer(@Param('id') id: string): Promise<void> {
    return this.preferService.remove(id);
  }

  @Get('export')
  @UseGuards(AdminAuthGuard)
  async exportPrefer(@Query('modeId') modeId?: string) {
    return this.preferService.exportAll(modeId);
  }

  @Post('import')
  @UseGuards(AdminAuthGuard)
  async importPrefer(@Body() dto: ImportPreferDto) {
    return this.preferService.bulkCreate(dto.questions);
  }

  @Post('create-party/local')
  @UseGuards(AuthGuard)
  @OptionalAuth()
  async createPartySolo(
    @Body() dto: CreatePartyPreferDto,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = detectLocale(acceptLanguage);
    const createGame: CreateGameDto = {
      gameType: GameType.PREFER,
      modeIds: dto.modes,
      isLocal: true,
    };
    const game = await this.gameService.create(createGame, session?.user?.id);
    return { gameId: game.id, questions: await this.preferService.createPartySolo(dto, locale) };
  }

  @Post('create-party/online')
  @UseGuards(AuthGuard)
  async createPartyOnline(
    @Body() dto: CreatePartyOnlinePreferDto,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const createGame: CreateGameDto = {
      gameType: GameType.PREFER,
      modeIds: dto.modes,
      isLocal: false,
      customQuestions: dto.customQuestions,
    };
    const game = await this.gameService.create(createGame, session.user.id);
    return { gameId: game.id, code: game.code };
  }
}
