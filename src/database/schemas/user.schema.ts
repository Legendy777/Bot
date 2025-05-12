import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ default: 'ru' })
  language: string;

  @Prop({ default: 0 })
  balance: number;

  @Prop({ default: 5 })
  refPercent: number;

  @Prop({ default: [] })
  referrals: string[];

  @Prop({ default: false })
  isSubscribed: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);