import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class OfficeLocation {
  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  address?: string;

  @Prop({ default: 100 })
  radius: number; // radius in meters
}

export type OfficeLocationDocument = OfficeLocation & Document;
export const OfficeLocationSchema = SchemaFactory.createForClass(OfficeLocation);