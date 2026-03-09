import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TruthDareService } from '../service/truth-dare.service.js';
import { TruthDare } from '../entities/truth-dare.entity.js';
import { CreateTruthDareDto } from '../dto/create-truth-dare.dto.js';
import { ImportTruthDareDto } from '../dto/import-truth-dare.dto.js';
import { UpdateTruthDareDto } from '../dto/update-truth-dare.dto.js';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard.js';
import { CreatePartyTruthDareDto, CreatePartyOnlineTruthDareDto } from '../dto/create-party-truth-dare.dto.js';
import { CreateGameDto } from '../../game/dto/create-game.dto.js';
import { GameType } from '../../../types/enums/GameType.js';
import { Gender } from '../../../types/enums/Gender.js';
import { ChallengeType } from '../../../types/enums/TruthDareChallengeType.js';
import {
  AuthGuard,
  OptionalAuth,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { GameService } from '../../game/service/game.service.js';

@Controller('truth-dare')
export class TruthDareController {
  constructor(private readonly truthDareService: TruthDareService, private readonly gameService: GameService) {}

  @Post("")
  @UseGuards(AdminAuthGuard)
  async createTruthDare(@Body() dto: CreateTruthDareDto): Promise<TruthDare> {
    return this.truthDareService.create(dto);
  }

  @Get("")
  async findAllTruthDare(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('modeId') modeId?: string,
    @Query('search') search?: string,
  ) {
    return this.truthDareService.findAll(+(page ?? 1), +(limit ?? 50), modeId, search);
  }

  @Put(":id")
  @UseGuards(AdminAuthGuard)
  async updateTruthDare(
    @Param('id') id: string,
    @Body() dto: UpdateTruthDareDto,
  ): Promise<TruthDare | null> {
    return this.truthDareService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(AdminAuthGuard)
  async deleteTruthDare(@Param('id') id: string): Promise<void> {
    return this.truthDareService.remove(id);
  }

  @Get("export")
  @UseGuards(AdminAuthGuard)
  async exportTruthDare(@Query('modeId') modeId?: string): Promise<TruthDare[]> {
    return this.truthDareService.exportAll(modeId);
  }

  @Post("import")
  @UseGuards(AdminAuthGuard)
  async importTruthDare(@Body() dto: ImportTruthDareDto) {
    return this.truthDareService.bulkCreate(dto.questions);
  }

  @Post("create-party/local")
  @UseGuards(AuthGuard)
  @OptionalAuth()
  async createPartySolo(@Body() dto: CreatePartyTruthDareDto, @Session() session: UserSession) {
    const createGame: CreateGameDto = {
      gameType: GameType.TRUTH_DARE,
      modeIds: dto.modes,
      isLocal: true,
    }
    const game = await this.gameService.create(createGame, session?.user?.id)
    return { gameId: game.id, questions: await this.truthDareService.createPartySolo(dto) };
  }

  @Post("create-party/online")
  @UseGuards(AuthGuard)
  async createPartyOnline(@Body() dto: CreatePartyOnlineTruthDareDto, @Session() session: UserSession) {
    const createGame: CreateGameDto = {
      gameType: GameType.TRUTH_DARE,
      modeIds: dto.modes,
      isLocal: false,
    }
    const game = await this.gameService.create(createGame, session.user.id)
    return { gameId: game.id, code: game.code }
  }
}