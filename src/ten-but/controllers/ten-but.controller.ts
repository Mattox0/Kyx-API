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
import { CreateTenButDto } from '../dto/create-ten-but.dto.js';
import { ImportTenButDto } from '../dto/import-ten-but.dto.js';
import { TenButService } from '../service/ten-but.service.js';
import { UpdateTenButDto } from '../dto/update-ten-but.dto.js';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard.js';
import { CreatePartyTenButDto, CreatePartyOnlineTenButDto } from '../dto/create-party-ten-but.dto.js';
import { CreateGameDto } from '../../game/dto/create-game.dto.js';
import { GameType } from '../../../types/enums/GameType.js';
import { AuthGuard, OptionalAuth, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { GameService } from '../../game/service/game.service.js';
import { detectLocale } from '../../config/languages.js';

@Controller('ten-but')
export class TenButController {
  constructor(private readonly tenButService: TenButService, private readonly gameService: GameService) {}

  @Post('')
  @UseGuards(AdminAuthGuard)
  async createTenBut(@Body() dto: CreateTenButDto) {
    return this.tenButService.create(dto);
  }

  @Get('translations/stats')
  @UseGuards(AdminAuthGuard)
  async getTenButTranslationStats() {
    return this.tenButService.getTranslationStats();
  }

  @Get('')
  async findAllTenBut(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('modeId') modeId?: string,
    @Query('search') search?: string,
    @Query('locale') locale?: string,
    @Query('locale_status') locale_status?: 'translated' | 'untranslated',
  ) {
    return this.tenButService.findAll(+(page ?? 1), +(limit ?? 50), modeId, search, locale, locale_status);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  async updateTenBut(@Param('id') id: string, @Body() dto: UpdateTenButDto) {
    return this.tenButService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async deleteTenBut(@Param('id') id: string): Promise<void> {
    return this.tenButService.remove(id);
  }

  @Get('export')
  @UseGuards(AdminAuthGuard)
  async exportTenBut(@Query('modeId') modeId?: string) {
    return this.tenButService.exportAll(modeId);
  }

  @Post('import')
  @UseGuards(AdminAuthGuard)
  async importTenBut(@Body() dto: ImportTenButDto) {
    return this.tenButService.bulkCreate(dto.questions);
  }

  @Post('create-party/local')
  @UseGuards(AuthGuard)
  @OptionalAuth()
  async createPartySolo(
    @Body() dto: CreatePartyTenButDto,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage: string = 'fr',
  ) {
    const locale = detectLocale(acceptLanguage);
    const createGame: CreateGameDto = {
      gameType: GameType.TEN_BUT,
      modeIds: dto.modes,
      isLocal: true,
    };
    const game = await this.gameService.create(createGame, session?.user?.id);
    return { gameId: game.id, questions: await this.tenButService.createPartySolo(dto, locale) };
  }

  @Post('create-party/online')
  @UseGuards(AuthGuard)
  async createPartyOnline(
    @Body() dto: CreatePartyOnlineTenButDto,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage: string = 'fr',
  ) {
    const createGame: CreateGameDto = {
      gameType: GameType.TEN_BUT,
      modeIds: dto.modes,
      isLocal: false,
      customQuestions: dto.customQuestions,
    };
    const locale = detectLocale(acceptLanguage);
    const game = await this.gameService.create(createGame, session.user.id, locale);
    return { gameId: game.id, code: game.code };
  }
}
