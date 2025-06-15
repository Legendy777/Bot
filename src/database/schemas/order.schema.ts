import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ versionKey: false, timestamps: true })
export class Order {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  productId: string;

  @Prop({ enum: ['paid', 'pending', 'cancelled'], default: 'pending' })
  status: 'paid' | 'pending' | 'cancelled';

  @Prop({ required: true })
  amount: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
