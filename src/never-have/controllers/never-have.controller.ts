import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateNeverHaveDto } from '../dto/create-never-have.dto.js';
import { ImportNeverHaveDto } from '../dto/import-never-have.dto.js';
import { NeverHaveService } from '../service/never-have.service.js';
import { UpdateNeverHaveDto } from '../dto/update-never-have.dto.js';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard.js';
import {
  CreatePartyNeverHaveDto,
  CreatePartyOnlineNeverHaveDto,
} from '../dto/create-party-never-have.dto.js';
import { GameService } from '../../game/service/game.service.js';
import { AuthGuard, OptionalAuth, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { CreateGameDto } from '../../game/dto/create-game.dto.js';
import { GameType } from '../../../types/enums/GameType.js';
import { detectLocale } from '../../config/languages.js';

@Controller('never-have')
export class NeverHaveController {
  constructor(private readonly neverHaveService: NeverHaveService, private readonly gameService: GameService) {}

  @Post('')
  @UseGuards(AdminAuthGuard)
  async createNeverHave(@Body() dto: CreateNeverHaveDto) {
    return this.neverHaveService.create(dto);
  }

  @Get('translations/stats')
  @UseGuards(AdminAuthGuard)
  async getNeverHaveTranslationStats() {
    return this.neverHaveService.getTranslationStats();
  }

  @Get('')
  async findAllNeverHave(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('modeId') modeId?: string,
    @Query('search') search?: string,
    @Query('locale') locale?: string,
    @Query('locale_status') locale_status?: 'translated' | 'untranslated',
  ) {
    return this.neverHaveService.findAll(+(page ?? 1), +(limit ?? 50), modeId, search, locale, locale_status);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  async updateNeverHave(@Param('id') id: string, @Body() dto: UpdateNeverHaveDto) {
    return this.neverHaveService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async deleteNeverHave(@Param('id') id: string): Promise<void> {
    return this.neverHaveService.remove(id);
  }

  @Get('export')
  @UseGuards(AdminAuthGuard)
  async exportNeverHave(@Query('modeId') modeId?: string) {
    return this.neverHaveService.exportAll(modeId);
  }

  @Post('import')
  @UseGuards(AdminAuthGuard)
  async importNeverHave(@Body() dto: ImportNeverHaveDto) {
    return this.neverHaveService.bulkCreate(dto.questions);
  }

  @Post('create-party/local')
  @UseGuards(AuthGuard)
  @OptionalAuth()
  async createPartySolo(
    @Body() dto: CreatePartyNeverHaveDto,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage: string = 'fr',
  ) {
    const locale = detectLocale(acceptLanguage);
    const createGame: CreateGameDto = {
      gameType: GameType.NEVER_HAVE,
      modeIds: dto.modes,
      isLocal: true,
    };
    const game = await this.gameService.create(createGame, session?.user?.id);
    return { gameId: game.id, questions: await this.neverHaveService.createPartySolo(dto, locale) };
  }

  @Post('create-party/online')
  @UseGuards(AuthGuard)
  async createPartyOnline(
    @Body() dto: CreatePartyOnlineNeverHaveDto,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage: string = 'fr',
  ) {
    const createGame: CreateGameDto = {
      gameType: GameType.NEVER_HAVE,
      modeIds: dto.modes,
      isLocal: false,
      customQuestions: dto.customQuestions,
    };
    const locale = detectLocale(acceptLanguage);
    const game = await this.gameService.create(createGame, session.user.id, locale);
    return { gameId: game.id, code: game.code };
  }
}
