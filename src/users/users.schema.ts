import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ enum: ['admin', 'employee'], default: 'employee', index: true })
  role: 'admin' | 'employee';

  @Prop({ required: true, default: 8 })
  shiftHours: number;

  @Prop({ default: '09:00' })
  shiftStartLocal: string;

  @Prop({ default: 'en' })
  locale: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true, default: 0 })
  salary: number;

  @Prop({ default: '' })
  phone: string;

  @Prop({ enum: ['active', 'suspended'], default: 'active' })
  status: 'active' | 'suspended';

  @Prop({ default: 21 }) // 21 days annual leave
  availableLeaves: number;

  @Prop({ default: '/images/profileImages/profile.svg' }) // Default profile image
  profileImage: string;

  @Prop({ type: [String], default: [] }) // List of holidays
  holidays: string[];

  @Prop({ type: String, default: null }) // Refresh token
  refreshToken: string;

  @Prop({ type: Date, default: null }) // Refresh token expiration
  refreshTokenExpires: Date;
}
export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
