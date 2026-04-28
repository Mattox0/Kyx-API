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
import { CreateQuizzDto } from '../dto/create-quizz.dto.js';
import { ImportQuizzDto } from '../dto/import-quizz.dto.js';
import { QuizzService } from '../service/quizz.service.js';
import { UpdateQuizzDto } from '../dto/update-quizz.dto.js';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard.js';
import { CreatePartyQuizzDto, CreatePartyOnlineQuizzDto } from '../dto/create-party-quizz.dto.js';
import { CreateGameDto } from '../../game/dto/create-game.dto.js';
import { GameType } from '../../../types/enums/GameType.js';
import { AuthGuard, OptionalAuth, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { GameService } from '../../game/service/game.service.js';
import { detectLocale } from '../../config/languages.js';
import { QuizzDifficulty } from '../../../types/enums/QuizzDifficulty.js';

@Controller('quizz')
export class QuizzController {
  constructor(private readonly quizzService: QuizzService, private readonly gameService: GameService) {}

  @Post('')
  @UseGuards(AdminAuthGuard)
  async createQuizz(@Body() dto: CreateQuizzDto) {
    return this.quizzService.create(dto);
  }

  @Get('translations/stats')
  @UseGuards(AdminAuthGuard)
  async getQuizzTranslationStats() {
    return this.quizzService.getTranslationStats();
  }

  @Get('')
  async findAllQuizz(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('modeId') modeId?: string,
    @Query('search') search?: string,
    @Query('locale') locale?: string,
    @Query('locale_status') locale_status?: 'translated' | 'untranslated',
    @Query('difficulty') difficulty?: QuizzDifficulty,
  ) {
    return this.quizzService.findAll(+(page ?? 1), +(limit ?? 50), modeId, search, locale, locale_status, difficulty);
  }

  @Get('export')
  @UseGuards(AdminAuthGuard)
  async exportQuizz(@Query('modeId') modeId?: string) {
    return this.quizzService.exportAll(modeId);
  }

  @Get(':id')
  async findOneQuizz(@Param('id') id: string) {
    return this.quizzService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  async updateQuizz(@Param('id') id: string, @Body() dto: UpdateQuizzDto) {
    return this.quizzService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async deleteQuizz(@Param('id') id: string): Promise<void> {
    return this.quizzService.remove(id);
  }

  @Post('import')
  @UseGuards(AdminAuthGuard)
  async importQuizz(@Body() dto: ImportQuizzDto) {
    return this.quizzService.bulkCreate(dto.questions);
  }

  @Post('create-party/local')
  @UseGuards(AuthGuard)
  @OptionalAuth()
  async createPartySolo(
    @Body() dto: CreatePartyQuizzDto,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage: string = 'fr',
  ) {
    const locale = detectLocale(acceptLanguage);
    const createGame: CreateGameDto = {
      gameType: GameType.QUIZZ,
      modeIds: dto.modes,
      isLocal: true,
    };
    const game = await this.gameService.create(createGame, session?.user?.id);
    return { gameId: game.id, questions: await this.quizzService.createPartySolo(dto, locale) };
  }

  @Post('create-party/online')
  @UseGuards(AuthGuard)
  async createPartyOnline(
    @Body() dto: CreatePartyOnlineQuizzDto,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage: string = 'fr',
  ) {
    const createGame: CreateGameDto = {
      gameType: GameType.QUIZZ,
      modeIds: dto.modes,
      isLocal: false,
      customQuestions: dto.customQuestions,
      quizzDifficulties: dto.difficulties,
    };
    const locale = detectLocale(acceptLanguage);
    const game = await this.gameService.create(createGame, session.user.id, locale);
    return { gameId: game.id, code: game.code };
  }
}
