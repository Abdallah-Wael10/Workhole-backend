import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Timer {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  tag: string; // Task name/description

  @Prop({ required: true })
  duration: number; // Duration in minutes (10, 25, 30, etc.)

  @Prop({ required: true })
  startTime: Date; // When timer actually started

  @Prop()
  endTime?: Date; // When timer ended (null if still running)

  @Prop({
    enum: ['running', 'completed', 'cancelled'],
    default: 'running',
    index: true,
  })
  status: 'running' | 'completed' | 'cancelled';

  @Prop({ default: 0 })
  actualDuration?: number; // Actual minutes spent (calculated when completed)

  @Prop()
  note?: string; // Optional note when completing

  @Prop({ default: false })
  emailSent: boolean; // Track if start email was sent

  @Prop({ default: false })
  completionEmailSent: boolean; // Track if completion email was sent

  // Add these fields explicitly
  createdAt?: Date;
  updatedAt?: Date;
}

export type TimerDocument = Timer & Document;
export const TimerSchema = SchemaFactory.createForClass(Timer);
