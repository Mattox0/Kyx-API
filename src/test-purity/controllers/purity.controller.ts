import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PurityService } from '../service/purity.service.js';
import { CreatePurityDto } from '../dto/create-purity.dto.js';
import { UpdatePurityDto } from '../dto/update-purity.dto.js';
import { CalculatePurityScoreDto } from '../dto/calculate-purity-score.dto.js';
import { ReorderPurityDto } from '../dto/reorder-purity.dto.js';
import { ImportPurityDto } from '../dto/import-purity.dto.js';
import { StartPurityTestDto } from '../dto/start-purity-test.dto.js';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard.js';
import { detectLocale } from '../../config/languages.js';

@Controller('purity')
export class PurityController {
  constructor(private readonly purityService: PurityService) {}

  @Post('import')
  @UseGuards(AdminAuthGuard)
  async import(@Body() dto: ImportPurityDto) {
    return this.purityService.import(dto);
  }

  @Post('calculate-score')
  async calculateScore(
    @Body() dto: CalculatePurityScoreDto,
    @Headers('accept-language') acceptLanguage: string = 'fr',
  ) {
    const locale = detectLocale(acceptLanguage);
    return this.purityService.calculateScore(dto, locale);
  }

  @Post('start-test')
  async startTest(
    @Body() dto: StartPurityTestDto,
    @Headers('accept-language') acceptLanguage: string = 'fr',
  ) {
    const locale = detectLocale(acceptLanguage);
    return this.purityService.startTest(dto.modeIds, locale);
  }

  @Post('')
  @UseGuards(AdminAuthGuard)
  async create(@Body() dto: CreatePurityDto) {
    return this.purityService.create(dto);
  }


  @Get('')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('modeId') modeId?: string,
    @Query('search') search?: string,
  ) {
    return this.purityService.findAll(+(page ?? 1), +(limit ?? 50), modeId, search);
  }

  @Get('by-mode/:modeId')
  async findByMode(@Param('modeId') modeId: string) {
    return this.purityService.findByMode(modeId);
  }

  @Put('reorder')
  @UseGuards(AdminAuthGuard)
  @HttpCode(204)
  async reorder(@Body() dto: ReorderPurityDto): Promise<void> {
    return this.purityService.reorder(dto.ids);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.purityService.findOne(id);
    if (!entity) throw new NotFoundException(`Purity question with id "${id}" not found`);
    return entity;
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdatePurityDto) {
    return this.purityService.update(id, dto);
  }

  @Put(':id/answers/reorder')
  @UseGuards(AdminAuthGuard)
  @HttpCode(204)
  async reorderAnswers(@Param('id') _id: string, @Body() dto: ReorderPurityDto): Promise<void> {
    return this.purityService.reorderAnswers(dto.ids);
  }

  @Delete(':id/answers/:answerId')
  @UseGuards(AdminAuthGuard)
  async removeAnswer(@Param('answerId') answerId: string): Promise<void> {
    return this.purityService.removeAnswer(answerId);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async remove(@Param('id') id: string): Promise<void> {
    return this.purityService.remove(id);
  }
}
