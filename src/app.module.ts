import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BotModule } from './bot/bot.module';
import { DatabaseModule } from './database/database.module';
import { DatabaseService } from './database/database.service';
import { TelegrafModule } from 'nestjs-telegraf';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
        botName: configService.get('BOT_USERNAME'),
        include: [BotModule],
      }),
      inject: [ConfigService],
    }),
    BotModule,
    DatabaseModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit() {
    // Инициализация игр при запуске приложения
    await this.databaseService.initializeGames();
  }
}