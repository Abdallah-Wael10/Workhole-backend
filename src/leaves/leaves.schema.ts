import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../users/users.schema';

@Schema({ timestamps: true })
export class Leave {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    enum: ['Annual Leave', 'Sick Leave', 'Emergency Leave', 'Unpaid Leave'],
    required: true,
    index: true,
  })
  leaveType: 'Annual Leave' | 'Sick Leave' | 'Emergency Leave' | 'Unpaid Leave';

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  days: number;

  @Prop({ required: true })
  reason: string;

  @Prop()
  attachmentUrl?: string;

  @Prop({
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  })
  status: 'pending' | 'approved' | 'rejected';

  @Prop({ type: Types.ObjectId, ref: 'User' })
  actionBy?: Types.ObjectId;

  @Prop()
  actionNote?: string;

  @Prop()
  actionDate?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export type LeaveDocument = Leave & Document;
export const LeaveSchema = SchemaFactory.createForClass(Leave);

// Define populated types
export interface LeaveWithUser extends Omit<Leave, 'userId' | 'actionBy'> {
  _id: string;
  userId: User;
  actionBy?: User;
  createdAt: Date;
  updatedAt: Date;
}
