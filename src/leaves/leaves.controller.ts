import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto } from './dto/create-leaves-dto';
import { UpdateLeaveDto, AdminActionDto } from './dto/update-leaves-dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { leaveAttachmentMulterConfig } from '../middleware/multer-config.middleware';

@UseGuards(JwtAuthGuard)
@Controller('/api/leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  // Create leave request with optional file attachment (SINGLE ENDPOINT)
  @Post()
  @UseInterceptors(FileInterceptor('attachment', leaveAttachmentMulterConfig))
  async createLeave(
    @Body() dto: CreateLeaveDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    // Process file if uploaded
    let attachmentUrl: string | undefined;
    if (file) {
      attachmentUrl = `/images/leaveAttachments/${file.filename}`;
    }

    return this.leavesService.createLeave(req.user.id, dto, attachmentUrl);
  }

  // Get my leaves
  @Get('me')
  async getMyLeaves(@Request() req) {
    const leaves: any[] = await this.leavesService.getUserLeaves(req.user.id);
    return leaves.map((leave) => ({
      id: leave._id,
      leaveType: leave.leaveType,
      startDate: leave.startDate.toISOString().split('T')[0],
      endDate: leave.endDate.toISOString().split('T')[0],
      days: leave.days,
      status: leave.status,
      reason: leave.reason,
      attachmentUrl: leave.attachmentUrl,
      actionBy: leave.actionBy
        ? `${leave.actionBy.firstName} ${leave.actionBy.lastName}`
        : null,
      actionNote: leave.actionNote,
      actionDate: leave.actionDate,
      createdAt: leave.createdAt,
    }));
  }

  // Get leave statistics
  @Get('stats')
  async getLeaveStats(@Request() req) {
    return this.leavesService.getLeaveStats(req.user.id);
  }

  // Update my leave (only pending)
  @Put(':id')
  async updateLeave(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveDto,
    @Request() req,
  ) {
    return this.leavesService.updateLeave(id, req.user.id, dto);
  }

  // Delete my leave (only pending)
  @Delete(':id')
  async deleteLeave(@Param('id') id: string, @Request() req) {
    return this.leavesService.deleteLeave(id, req.user.id);
  }

  // Admin: Get all leaves
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  async getAllLeaves() {
    const leaves: any[] = await this.leavesService.getAllLeaves();
    return leaves.map((leave) => ({
      id: leave._id,
      user: `${leave.userId.firstName} ${leave.userId.lastName}`,
      userEmail: leave.userId.email,
      leaveType: leave.leaveType,
      startDate: leave.startDate.toISOString().split('T')[0],
      endDate: leave.endDate.toISOString().split('T')[0],
      days: leave.days,
      status: leave.status,
      reason: leave.reason,
      attachmentUrl: leave.attachmentUrl,
      actionBy: leave.actionBy
        ? `${leave.actionBy.firstName} ${leave.actionBy.lastName}`
        : null,
      actionNote: leave.actionNote,
      actionDate: leave.actionDate,
      createdAt: leave.createdAt,
    }));
  }

  // Admin: Approve/Reject leave
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put('admin/:id/action')
  async adminAction(
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
    @Request() req,
  ) {
    return this.leavesService.adminAction(id, req.user.id, dto);
  }
}
