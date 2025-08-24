import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationType =
  | 'leave'
  | 'break'
  | 'attendance'
  | 'timer'
  | 'account'
  | 'admin';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: ['leave', 'break', 'attendance', 'timer', 'account', 'admin'], required: true })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true }) 
  message: string;

  @Prop({ type: String, enum: ['unread', 'read'], default: 'unread' })
  status: 'unread' | 'read';

  @Prop({ type: String, enum: ['en', 'ar'], default: 'ar' })
  lang: 'en' | 'ar';
}

export type NotificationDocument = Notification & Document;
export const NotificationSchema = SchemaFactory.createForClass(Notification);