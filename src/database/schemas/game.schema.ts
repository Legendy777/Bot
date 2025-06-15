import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameDocument = Game & Document;

@Schema()
export class Game {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  emoji: string;

  @Prop({ required: true })
  gifUrl: string;

  @Prop()
  image: string;

  @Prop()
  hasDiscount: boolean;

  @Prop()
  isActual: boolean;

  @Prop()
  enabled: boolean;

  @Prop()
  trailerUrl: string;

  @Prop()
  googlePlayUrl: string;

  @Prop()
  appStoreUrl: string;
}

export const GameSchema = SchemaFactory.createForClass(Game);
