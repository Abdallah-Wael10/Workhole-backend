import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Timer {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  tag: string; // Task name/description

  @Prop({ required: true, default: 0 })
  duration: number; // Planned duration in minutes (0 = unlimited stopwatch)

  @Prop({ required: true })
  startTime: Date; // When timer actually started

  @Prop()
  endTime?: Date; // When timer ended

  @Prop({
    enum: ['running', 'paused', 'completed', 'cancelled'],
    default: 'running',
    index: true,
  })
  status: 'running' | 'paused' | 'completed' | 'cancelled';

  @Prop({ default: 0 })
  actualDuration?: number; // Actual minutes spent

  @Prop({ default: 0 })
  actualDurationSeconds?: number; // Actual seconds spent (for precision)

  @Prop()
  pausedAt?: Date; // When paused

  @Prop({ default: 0 })
  totalPaused?: number; // Total paused time in seconds

  @Prop()
  note?: string; // Optional note when completing/cancelling
}

export type TimerDocument = Timer & Document;
export const TimerSchema = SchemaFactory.createForClass(Timer);
