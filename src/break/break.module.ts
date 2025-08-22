import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BreakController } from './break.controller';
import { BreakService } from './break.service';
import { MailModule } from '../mail/mail.module'; // أضف هذا
import { User, UserSchema } from '../users/users.schema'; // أضف هذا
import {
  BreakType,
  BreakTypeSchema,
  UserBreak,
  UserBreakSchema,
} from './break.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BreakType.name, schema: BreakTypeSchema },
      { name: UserBreak.name, schema: UserBreakSchema },
      { name: User.name, schema: UserSchema }, // أضف هذا
    ]),
    MailModule, // أضف هذا
  ],
  controllers: [BreakController],
  providers: [BreakService],
  exports: [BreakService],
})
export class BreakModule {}
