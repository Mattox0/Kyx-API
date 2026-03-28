import { Controller, Get, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service.js';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard.js';

@Controller('finance')
@UseGuards(AdminAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('overview')
  async getOverview() {
    return this.financeService.getOverview();
  }
}
