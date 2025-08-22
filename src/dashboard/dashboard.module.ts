import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import {
  AttendanceLog,
  AttendanceLogSchema,
} from '../attendance/attendance.schema';
import { Leave, LeaveSchema } from '../leaves/leaves.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AttendanceLog.name, schema: AttendanceLogSchema },
      { name: Leave.name, schema: LeaveSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
