import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceLog, AttendanceLogSchema } from './attendance.schema';
import { User, UserSchema } from '../users/users.schema';
import { UserBreak, UserBreakSchema } from '../break/break.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AttendanceLog.name, schema: AttendanceLogSchema },
      { name: User.name, schema: UserSchema },
      { name: UserBreak.name, schema: UserBreakSchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
