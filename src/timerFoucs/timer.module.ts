import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TimerController } from './timer.controller';
import { TimerService } from './timer.service';
import { Timer, TimerSchema } from './timer.schema';
import { User, UserSchema } from '../users/users.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Timer.name, schema: TimerSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [TimerController],
  providers: [TimerService],
  exports: [TimerService],
})
export class TimerModule {}
