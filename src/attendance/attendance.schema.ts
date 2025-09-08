import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class AttendanceLog {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  date: string; // "YYYY-MM-DD"

  @Prop()
  dayName: string; // "Monday", "Tuesday"

  @Prop()
  clockIn?: string; // "HH:mm" (local time)

  @Prop()
  clockOut?: string; // "HH:mm"

  @Prop({ default: 0 })
  workMinutes: number; // actual work minutes

  @Prop({
    enum: ['present', 'absent', 'late', 'early'],
    default: 'present',
    index: true,
  })
  status: 'present' | 'absent' | 'late' | 'early';

  @Prop({ enum: ['office', 'home'], default: 'office', index: true })
  location: 'office' | 'home';

  @Prop({ default: false })
  isOvertime: boolean; // overtime day?

  @Prop({ default: 0 })
  breakMinutes: number; // total break time taken

  @Prop()
  officeName?: string;
}

export type AttendanceLogDocument = AttendanceLog & Document;
export const AttendanceLogSchema = SchemaFactory.createForClass(AttendanceLog);
