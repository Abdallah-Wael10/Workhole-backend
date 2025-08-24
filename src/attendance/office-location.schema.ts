import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class OfficeLocation {
  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;
}

export type OfficeLocationDocument = OfficeLocation & Document;
export const OfficeLocationSchema = SchemaFactory.createForClass(OfficeLocation);