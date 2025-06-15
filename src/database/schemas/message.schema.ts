import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ versionKey: false, timestamps: { createdAt: true, updatedAt: false } })
export class Message {
  @Prop({ required: true })
  userId: string;

  @Prop({ enum: ['user', 'admin', 'bot'], required: true })
  sender: 'user' | 'admin' | 'bot';

  @Prop({ required: true })
  message: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
