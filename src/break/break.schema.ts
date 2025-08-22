import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BreakType {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  duration: number; // in minutes

  @Prop({ default: true })
  isActive: boolean;
}
export type BreakTypeDocument = BreakType & Document;
export const BreakTypeSchema = SchemaFactory.createForClass(BreakType);

@Schema({ timestamps: true })
export class UserBreak {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  breakType: string; // BreakType name

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop({ default: 0 })
  duration: number; // in minutes

  @Prop({ default: false })
  exceeded: boolean;
}
export type UserBreakDocument = UserBreak & Document;
export const UserBreakSchema = SchemaFactory.createForClass(UserBreak);
