import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TimerController } from './timer.controller';
import { TimerService } from './timer.service';
import { Timer, TimerSchema } from './timer.schema';
import { User, UserSchema } from '../users/users.schema';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Timer.name, schema: TimerSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MailModule,
    NotificationsModule,
  ],
  controllers: [TimerController],
  providers: [TimerService],
  exports: [TimerService],
})
export class TimerModule {}
