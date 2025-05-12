import { Module } from '@nestjs/common';
import { BotService } from '../bot.service';
import { DatabaseModule } from '../database/database.module';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from '../bot.update';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    TelegrafModule,
  ],
  providers: [BotService, BotUpdate],
  exports: [BotService],
})
export class BotModule {} 