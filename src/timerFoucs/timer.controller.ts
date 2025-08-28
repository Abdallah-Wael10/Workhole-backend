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
import { UpdateTimerDto } from './dto/update-timer.dto';
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

  // Get current running timer (optional - for checking status)
  @Get('current')
  async getCurrentTimer(@Request() req) {
    return this.timerService.getCurrentTimer(req.user.id);
  }

  // Pause a timer
  @Put(':id/pause')
  async pauseTimer(@Param('id') id: string, @Request() req) {
    return this.timerService.pauseTimer(req.user.id, id);
  }

  // Resume a timer
  @Put(':id/resume')
  async resumeTimer(@Param('id') id: string, @Request() req) {
    return this.timerService.resumeTimer(req.user.id, id);
  }

  // Complete a timer
  @Put(':id/complete')
  async completeTimer(
    @Param('id') id: string,
    @Body() dto: UpdateTimerDto,
    @Request() req,
  ) {
    return this.timerService.completeTimer(req.user.id, id, dto);
  }

  // Cancel a timer
  @Put(':id/cancel')
  async cancelTimer(
    @Param('id') id: string,
    @Body() dto: UpdateTimerDto,
    @Request() req,
  ) {
    return this.timerService.cancelTimer(req.user.id, id, dto);
  }
}
