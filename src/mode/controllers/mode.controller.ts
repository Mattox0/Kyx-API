import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ModeService } from '../service/mode.service.js';
import { CreateModeDto } from '../dto/create-mode.dto.js';
import { UpdateModeDto } from '../dto/update-mode.dto.js';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard.js';

const multerOptions = {
  storage: diskStorage({
    destination: './uploads/modes',
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
};

@Controller('mode')
export class ModeController {
  constructor(private readonly modeService: ModeService) {}

  @Post()
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('icon', multerOptions))
  async create(
    @Body() dto: CreateModeDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<object | null> {
    const iconPath = file ? file.path : undefined;
    return this.modeService.create(dto, iconPath);
  }

  @Get()
  async findAll(): Promise<object[]> {
    return this.modeService.findAll();
  }

  @Get('/game/:gameName')
  async findByGame(@Param('gameName') gameName: string): Promise<object[]> {
    return this.modeService.findByGame(gameName);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<object> {
    const mode = await this.modeService.findOne(id);
    if (!mode) throw new NotFoundException(`Mode ${id} not found`);
    return mode;
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('icon', multerOptions))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateModeDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<object> {
    const iconPath = file ? file.path : undefined;
    const mode = await this.modeService.update(id, dto, iconPath);
    if (!mode) throw new NotFoundException(`Mode ${id} not found`);
    return mode;
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async remove(@Param('id') id: string): Promise<void> {
    return this.modeService.remove(id);
  }
}
