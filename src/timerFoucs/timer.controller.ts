import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TimerService } from './timer.service';
import { CreateTimerDto } from './dto/create-timer.dto';
import { CompleteTimerDto, UpdateTimerDto } from './dto/update-timer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('/api/timer')
export class TimerController {
  constructor(private readonly timerService: TimerService) {}

  // Start a new timer
  @Post('start')
  async startTimer(@Body() dto: CreateTimerDto, @Request() req) {
    return this.timerService.startTimer(req.user.id, dto);
  }

  // Complete current timer
  @Put(':id/complete')
  async completeTimer(
    @Param('id') id: string,
    @Body() dto: CompleteTimerDto,
    @Request() req,
  ) {
    return this.timerService.completeTimer(id, req.user.id, dto);
  }

  // Cancel current timer
  @Put(':id/cancel')
  async cancelTimer(
    @Param('id') id: string,
    @Body() dto: UpdateTimerDto,
    @Request() req,
  ) {
    return this.timerService.cancelTimer(id, req.user.id, dto);
  }

  // Get my timer logs
  @Get('me')
  async getMyTimers(@Request() req) {
    return this.timerService.getMyTimers(req.user.id);
  }

  // Get current running timer
  @Get('current')
  async getCurrentTimer(@Request() req) {
    return this.timerService.getCurrentTimer(req.user.id);
  }

  // Get timer statistics
  @Get('stats')
  async getTimerStats(@Request() req) {
    return this.timerService.getTimerStats(req.user.id);
  }
}
