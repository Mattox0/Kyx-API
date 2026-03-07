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
import { ReportService } from '../service/report.service.js';
import { Report } from '../entities/report.entity.js';
import { CreateReportDto } from '../dto/create-report.dto.js';
import { UpdateReportDto } from '../dto/update-report.dto.js';
import {
  AuthGuard,
  OptionalAuth,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard.js';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post("")
  @UseGuards(AuthGuard)
  @OptionalAuth()
  async createReport(@Body() dto: CreateReportDto, @Session() session: UserSession): Promise<Report> {
    return this.reportService.create(dto, session?.user?.id);
  }

  @Get("")
  @UseGuards(AdminAuthGuard)
  async findAllReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('resolved') resolved?: boolean,
  ) {
    return this.reportService.findAll(+(page ?? 1), +(limit ?? 50), search, resolved);
  }

  @Get(":id")
  @UseGuards(AdminAuthGuard)
  async findOneReport(@Param('id') id: string): Promise<Report | null> {
    return this.reportService.findOne(id);
  }

  @Put(":id")
  @UseGuards(AdminAuthGuard)
  async updateReport(
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ): Promise<Report | null> {
    return this.reportService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(AdminAuthGuard)
  async deleteReport(@Param('id') id: string): Promise<void> {
    return this.reportService.remove(id);
  }
}
