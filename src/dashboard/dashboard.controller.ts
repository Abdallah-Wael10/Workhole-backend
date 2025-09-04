import { Controller, Get, Request, UseGuards, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardResponse } from './dashboard.types';

@UseGuards(JwtAuthGuard)
@Controller('/api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('me')
  async getDashboard(@Request() req, @Query('month') month?: string): Promise<DashboardResponse> {
    const monthNumber = month ? parseInt(month, 10) : undefined;
    return this.dashboardService.getDashboard(req.user.id, monthNumber);
  }
}
