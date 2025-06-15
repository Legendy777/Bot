import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ versionKey: false, timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ default: 'ru' })
  language: string;

  @Prop({ default: 0 })
  balance: number;

  @Prop({ default: 1 })
  refPercent: number;

  @Prop({
    type: [
      {
        userId: { type: String, required: true },
        joinedAt: { type: Date, default: Date.now },
        purchasesCount: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
      },
    ],
    default: [],
  })
  referrals: Array<{
    userId: string;
    joinedAt: Date;
    purchasesCount: number;
    totalSpent: number;
  }>;

  @Prop({ default: 0 })
  ordersCount: number;

  @Prop({ default: false })
  isSubscribed: boolean;

  @Prop({ default: false })
  isBanned: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
