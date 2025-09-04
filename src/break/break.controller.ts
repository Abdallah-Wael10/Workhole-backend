import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BreakService } from './break.service';
import { CreateBreakDto } from './dto/create-break.dto';
import { UpdateBreakDto } from './dto/update-break.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('/api/break')
export class BreakController {
  constructor(private readonly breakService: BreakService) {}

  // Admin: Create break type
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post('type')
  async createBreakType(@Body() dto: CreateBreakDto) {
    return this.breakService.createBreakType(dto);
  }

  // Admin: Update break type
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put('type/:id')
  async updateBreakType(@Param('id') id: string, @Body() dto: UpdateBreakDto) {
    return this.breakService.updateBreakType(id, dto);
  }

  // Admin: Delete break type
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete('type/:id')
  async deleteBreakType(@Param('id') id: string) {
    return this.breakService.deleteBreakType(id);
  }

  // Get break types
  @Get('types')
  async getBreakTypes() {
    return this.breakService.getBreakTypes();
  }

  // User: Start break
  @Post('start')
  async startBreak(@Body('breakType') breakType: string, @Request() req) {
    return this.breakService.startBreak(req.user.id, breakType);
  }

  // User: Stop break 
  @Post('stop')
  async stopBreak(@Request() req) {
    return this.breakService.stopBreak(req.user.id);
  }

  // User: Dashboard data
  @Get('me')
  async getMyBreakDashboard(@Request() req) {
    const userId = req.user.id;
    const today = await this.breakService.getTodaysBreakTime(userId);
    const stats = await this.breakService.getBreakStats(userId);

    return {
      todaysBreakTime: this.breakService.formatMinutes(today.totalMinutes), // تحويل لـ "3 min"
      mostUsedBreak: stats.mostUsed,
      avgBreakPerDay: this.breakService.formatMinutes(stats.avgPerDay), // تحويل لـ "3 min"
      breaksOverLimit: stats.breaksOverLimit,
      breakTypeUsage: stats.breakTypeUsage.map((item) => ({
        type: item.type,
        count: item.count,
        total: this.breakService.formatMinutes(item.total), // تحويل لـ "6 min"
      })),
    };
  }

  // User: All breaks with formatted data
  @Get('stats')
  async getBreakStatsDetails(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 4,
    @Query('sortBy') sortBy: string = 'newest',
    @Query('date') date: string = '',
    @Query('type') type: string = '',
    @Query() query
  ) {
    const userId =
      req.user.role === 'admin' && query.userId ? query.userId : req.user.id;
    
    const result = await this.breakService.listBreaksPaginated(
      { userId }, 
      Number(page), 
      Number(limit),
      sortBy,
      date,
      type
    );

    return {
      breaks: result.breaks.map((b) => ({
        date: b.startTime.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        day: b.startTime.toLocaleDateString('en-US', { weekday: 'long' }),
        breakType: b.breakType,
        duration: `${b.duration} min`,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime ? b.endTime.toISOString() : null,
        exceeded: b.exceeded,
      })),
      pagination: result.pagination,
      availableFilters: result.availableFilters, // إضافة الفلاتر المتاحة
    };
  }

  @Get('active-count')
  async getActiveBreaksCount(@Request() req) {
    return this.breakService.getActiveBreaksCount();
  }
}
