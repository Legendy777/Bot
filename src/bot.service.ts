import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup, Telegraf } from 'telegraf';
import { DatabaseService } from './database/database.service';
import { InlineQueryResultArticle, InlineQueryResultsButton } from 'telegraf/typings/core/types/typegram';
import { WELCOME_GIFS, GAME_CATEGORIES, SUBSCRIBE_REQUEST_GIF, BANNERS } from './config/constants';
import { GameDocument } from './database/schemas/game.schema';

const SUPPORT_URL = 'https://chat.integracio.ru/79950450f448d39e3465de1d7a2e24bc/mobile-games.online/ru';
import { Localization, localizations } from './bot/interfaces/localization.interface';
import { InjectBot } from 'nestjs-telegraf';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

// Используем GameDocument из MongoDB схемы

// Интерфейс для категорий
interface Category {
  name: string;
  emoji: string;
}

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly channelId: string;
  private readonly channelUrl: string;
  private bannerIndex: { [key: string]: number } = {};
  private slideshowIntervals: Map<
    string,
    {
      intervalId: NodeJS.Timeout;
      timeoutId: NodeJS.Timeout;
      chatId: number;
      messageId: number;
      language: string;
      callbackQueryId: string;
      lastInteractionTime: number;
    }
  > = new Map();
  private isPlaying: { [key: string]: boolean } = {};
  private userMessageIds: { [key: string]: number } = {};

  constructor(
    private readonly databaseService: DatabaseService,
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly configService: ConfigService,
  ) {
    const channelIdFromConfig = this.configService.get<string>('CHANNEL_TG');
    if (!channelIdFromConfig) {
      this.logger.error('CRITICAL: CHANNEL_TG is not set in the .env file! Subscription checks will fail.');
      this.channelId = '';
    } else {
      this.channelId = channelIdFromConfig;
    }
    this.channelUrl = 'https://t.me/tiptop_mgn';
    this.initializeActions();
  }

  private async stopSlideshow(userId: string, chatId?: number, messageId?: number, language?: string): Promise<boolean> {
    if (!userId) {
      this.logger.error(`[SLIDESHOW] stopSlideshow called without userId`);
      return false;
    }

    const slideshowData = this.slideshowIntervals.get(userId);
    const wasPlaying = Boolean(this.isPlaying[userId]);

    // Очищаем все таймеры и состояния
    if (slideshowData) {
      clearInterval(slideshowData.intervalId);
      clearTimeout(slideshowData.timeoutId);
      this.slideshowIntervals.delete(userId);
      this.logger.debug(`[SLIDESHOW] Cleared timers for user ${userId}`);
    }

    this.isPlaying[userId] = false;

    // Обновляем UI только если слайд-шоу было активно
    if (wasPlaying && chatId && messageId && language) {
      try {
        const l = this.getLocalization(language);
        const keyboard = this.getMainMenuKeyboard(language, userId);
        const isAutoStop = slideshowData && Date.now() - (slideshowData.lastInteractionTime || 0) > 30000;

        // Проверяем существование сообщения перед обновлением
        try {
          await this.bot.telegram.getChat(chatId);
          await this.bot.telegram.editMessageReplyMarkup(chatId, messageId, undefined, keyboard);
        } catch (error) {
          this.logger.warn(`[SLIDESHOW] Message ${messageId} not found or not accessible`);
          return wasPlaying;
        }

        // Отправляем уведомление только если есть валидный callbackQueryId
        if (slideshowData?.callbackQueryId) {
          try {
            const stopMessage = isAutoStop
              ? l.slideshow?.stoppedTimer || '⏹️ Автопрокрутка остановлена по таймеру'
              : l.slideshow?.stoppedManual || '⏹️ Автопрокрутка остановлена';
            
            await this.bot.telegram.answerCbQuery(
              slideshowData.callbackQueryId, 
              stopMessage
            ).catch(() => {
              this.logger.debug(`[SLIDESHOW] CallbackQueryId expired for user ${userId}`);
            });
          } catch (error) {
            this.logger.debug(`[SLIDESHOW] Non-critical callback query error: ${error.message}`);
          }
        }
      } catch (error) {
        this.logger.error(`[SLIDESHOW] Critical error in stopSlideshow: ${error.message}`);
      }
    }

    return wasPlaying;
  }

  private async startSlideshow(ctx: Context, userId: string, chatId: number, messageId: number, language: string): Promise<void> {
    if (this.isPlaying[userId]) {
      this.logger.debug(`[SLIDESHOW] Slideshow already running for user ${userId}`);
      return;
    }

    // Останавливаем предыдущее слайд-шоу если оно есть
    await this.stopSlideshow(userId);

    this.isPlaying[userId] = true;
    const intervalId = setInterval(async () => {
      if (!this.isPlaying[userId]) {
        clearInterval(intervalId);
        return;
      }

      try {
        // Проверяем существование чата и сообщения
        await this.bot.telegram.getChat(chatId);
        const games = await this.databaseService.getActualGames();
        this.bannerIndex[userId] = (this.bannerIndex[userId] + 1) % games.length;
        await this.showMainMenu(ctx, true, messageId);
      } catch (error) {
        this.logger.error(`[SLIDESHOW] Error in slideshow interval: ${error.message}`);
        await this.stopSlideshow(userId, chatId, messageId, language);
      }
    }, 5000);

    // Устанавливаем таймер автоостановки
    const timeoutId = setTimeout(async () => {
      await this.stopSlideshow(userId, chatId, messageId, language);
    }, 30000);

    // Сохраняем данные слайд-шоу
    this.slideshowIntervals.set(userId, {
      intervalId,
      timeoutId,
      chatId,
      messageId,
      language,
      callbackQueryId: ctx.callbackQuery?.id || '',
      lastInteractionTime: Date.now()
    });

    this.logger.debug(`[SLIDESHOW] Started slideshow for user ${userId}`);
  }

  private initializeActions() {
    this.bot.action('cabinet', async (ctx) => {
      if (!ctx.from) return;
      const userId = ctx.from.id.toString();
      const isPlaying = this.isPlaying[userId];
      
      if (isPlaying) {
        const user = await this.databaseService.getUserById(userId);
        const language = user?.language || 'ru';
        const l = this.getLocalization(language);
        await ctx.answerCbQuery(
          l.slideshow.alreadyPlaying || '⚠️ Stop slideshow first'
        );
        return;
      }
      
      await this.handleCabinet(ctx);
    });
    this.bot.action('banner_prev', async (ctx) => {
      if (!ctx.from) return;
      await this.handleBannerControl(ctx, 'prev');
    });
    this.bot.action('banner_next', async (ctx) => {
      if (!ctx.from) return;
      await this.handleBannerControl(ctx, 'next');
    });
    this.bot.action('banner_play', async (ctx) => {
      if (!ctx.from) return;
      await this.handleBannerControl(ctx, 'play');
    });
    this.bot.action('banner_stop', async (ctx) => {
      if (!ctx.from) return;
      await this.handleBannerControl(ctx, 'stop');
    });
    this.bot.action('check_subscription', async (ctx) => {
      if (!ctx.from) return;
      await this.stopSlideshow(ctx.from.id.toString());
      await this.handleCheckSubscription(ctx);
    });
    this.bot.action('lang_ru', async (ctx) => {
      if (!ctx.from) return;
      await this.stopSlideshow(ctx.from.id.toString());
      await this.handleLanguageChange(ctx, 'ru');
    });
    this.bot.action('lang_en', async (ctx) => {
      if (!ctx.from) return;
      await this.stopSlideshow(ctx.from.id.toString());
      await this.handleLanguageChange(ctx, 'en');
    });
    this.bot.action('back_to_menu', async (ctx) => {
      if (!ctx.from) return;
      const userId = ctx.from.id.toString();
      const user = await this.databaseService.getUserById(userId);
      const language = user?.language || 'ru';
      const l = this.getLocalization(language);

      // Если плеер активен, показываем уведомление
      if (this.isPlaying[userId]) {
        await ctx.answerCbQuery(
          l.slideshow.alreadyPlaying || '⚠️ Stop slideshow first'
        );
        return;
      }

      // Останавливаем слайдшоу если оно запущено
      await this.stopSlideshow(userId);

      const messageId = this.getMessageIdToEdit(ctx);
      await this.showMainMenu(ctx, true, messageId);
    });
    this.bot.action('refresh_cabinet', async (ctx) => {
      if (!ctx.from) return;
      await this.handleRefreshCabinet(ctx);
    });
    this.bot.action('orders', async (ctx) => {
      if (!ctx.from) return;
      const userId = ctx.from.id.toString();
      const user = await this.databaseService.getUserById(userId);
      const language = user?.language || 'ru';
      const l = this.getLocalization(language);

      if (this.isPlaying[userId]) {
        await ctx.answerCbQuery(
          l.slideshow.alreadyPlaying || '⚠️ Stop slideshow first'
        );
        return;
      }

      await this.stopSlideshow(userId);
      await this.handleOrders(ctx);
    });
    this.bot.action('deposit_usdt', async (ctx) => {
      if (!ctx.from) return;
      const userId = ctx.from.id.toString();
      const user = await this.databaseService.getUserById(userId);
      const language = user?.language || 'ru';
      const l = this.getLocalization(language);

      if (this.isPlaying[userId]) {
        await ctx.answerCbQuery(
          l.slideshow.alreadyPlaying || '⚠️ Stop slideshow first'
        );
        return;
      }

      await this.stopSlideshow(userId);
      await this.handleBalance(ctx);
    });
    this.bot.action('withdraw', async (ctx) => {
      if (!ctx.from) return;
      const userId = ctx.from.id.toString();
      const user = await this.databaseService.getUserById(userId);
      const language = user?.language || 'ru';
      const l = this.getLocalization(language);

      if (this.isPlaying[userId]) {
        await ctx.answerCbQuery(
          l.slideshow.alreadyPlaying || '⚠️ Stop slideshow first'
        );
        return;
      }

      await this.stopSlideshow(userId);
      await this.handleBalance(ctx);
    });

    // Обработчики reply кнопок
    this.bot.hears(['🏠 Меню', '🏠 Menu'], async (ctx) => {
      if (!ctx.from) return;
      const userId = ctx.from.id.toString();
      
      // Удаляем сообщение пользователя
      try {
        await ctx.deleteMessage();
      } catch (error) {
        this.logger.warn('Could not delete menu button message:', error);
      }
      
      await this.stopSlideshow(userId);
      await this.showMainMenu(ctx, false);
    });
    
    this.bot.hears(['👨‍💻 Поддержка', '👨‍💻 Support'], async (ctx) => {
      if (!ctx.from) return;
      const userId = ctx.from.id.toString();
      const user = await this.databaseService.getUserById(userId);
      const language = user?.language || 'ru';
      
      // Удаляем сообщение пользователя
      try {
        await ctx.deleteMessage();
      } catch (error) {
        this.logger.warn('Could not delete support button message:', error);
      }
      
      await this.stopSlideshow(userId);
      
      // Отправляем ссылку на поддержку
      const supportText = language === 'ru' 
        ? '👨‍💻 Поддержка\n\nОбратитесь к нашей службе поддержки для получения помощи:'
        : '👨‍💻 Support\n\nContact our support team for assistance:';
      
      const keyboard = {
        inline_keyboard: [
          [{ text: language === 'ru' ? '💬 Написать в поддержку' : '💬 Contact Support', url: SUPPORT_URL }],
          [{ text: language === 'ru' ? '🔙 Назад в меню' : '🔙 Back to Menu', callback_data: 'back_to_menu' }]
        ]
      };
      
      const message = await ctx.reply(supportText, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      
      // Удаляем сообщение через 3 секунды
      setTimeout(async () => {
        try {
          await ctx.deleteMessage(message.message_id);
        } catch (error) {
          this.logger.warn('Could not delete support message:', error);
        }
      }, 3000);
    });

    // Регистрируем обработчики кнопок навигации
    ['about', 'support', 'reviews'].forEach(action => {
      this.bot.action(action, async (ctx) => {
        if (!ctx.from) return;
        
        const userId = ctx.from.id.toString();
        const user = await this.databaseService.getUserById(userId);
        const language = user?.language || 'ru';
        const l = this.getLocalization(language);
        
        // Если плеер активен, показываем уведомление
        if (this.isPlaying[userId]) {
          await ctx.answerCbQuery(
            l.slideshow.alreadyPlaying || '⚠️ Stop slideshow first'
          );
          return;
        }

        // Останавливаем слайдшоу если оно запущено
        await this.stopSlideshow(userId);
        
        // Вызываем соответствующий обработчик
        switch(action) {
          case 'about':
            await this.handleAbout(ctx);
            break;
          case 'support':
            await this.handleSupport(ctx);
            break;
          case 'reviews':
            await this.handleReviews(ctx);
            break;
        }
      });
    });
  }


  async sendMessage(ctx: any, text: string) {
    const message = await ctx.reply(text);
    ctx.session.mainMessageId = message.message_id;
  }

  getLocalization(language: string): Localization {
    return localizations[language] || localizations.ru;
  }

  async getUserById(userId: string) {
    return await this.databaseService.getUserById(userId);
  }

  async handleStart(ctx: Context) {
    try {
      if (!ctx.from) return;
      const userId = ctx.from.id.toString();
      this.logger.log(`Start command received from user ${userId}`);

      // Временно удаляем пользователя для тестирования
      await this.databaseService.deleteUser(userId);
      this.logger.log(`User ${userId} deleted for testing`);

      let user = await this.databaseService.getUserById(userId);
      if (!user) {
        this.logger.log(`Creating new user ${userId}`);
        user = await this.databaseService.createUser(userId);
        this.logger.log(`New user ${userId} created successfully with ID: ${user._id}`);
        if ('startPayload' in ctx && ctx.startPayload) {
          const referrerId = ctx.startPayload;
          if (referrerId && referrerId !== userId) {
            this.logger.log(`User ${userId} was referred by ${referrerId}`);
            // Здесь можно добавить логику уведомления реферала
          }
        }
      } else {
        this.logger.log(`User ${userId} already exists in database with ID: ${user._id}`);
        if (user.isBanned) {
          this.logger.log(`User ${userId} is banned. Access denied.`);
          const language = user?.language || 'ru';
          const l = this.getLocalization(language);
          await ctx.reply(l.errors.userBlocked);
          return;
        }
      }

      if ('message' in ctx && ctx.message?.message_id) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          this.logger.warn('Could not delete message on /start:', error);
        }
      }

      await this.showLanguageSelection(ctx);
    } catch (error) {
      this.logger.error('Error in handleStart:', error);
      await ctx.reply('Произошла ошибка при запуске. Пожалуйста, попробуйте позже.');
    }
  }

  async showLanguageSelection(ctx: Context) {
    if (!ctx.from) return;
    const userId = ctx.from.id.toString();

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🇷🇺 RU', callback_data: 'lang_ru' },
          { text: '🇬🇧 EN', callback_data: 'lang_en' },
        ],
      ],
    };

    const langSelectionGif =
      WELCOME_GIFS?.ru || 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHppdWQzb3MxbzNndjhlZTFiMHpwYnI3Z2l0dGp4czc4dGppZGJiYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/NjCzN2GiZFlLjgHJO4/giphy.gif';

    if (ctx.callbackQuery?.message?.message_id && this.userMessageIds[userId] === ctx.callbackQuery.message.message_id) {
      try {
        await ctx.deleteMessage(this.userMessageIds[userId]);
        this.logger.log(`Deleted previous message ${this.userMessageIds[userId]} for user ${userId} before showing language selection.`);
      } catch (error) {
        this.logger.warn(`Could not delete message ${this.userMessageIds[userId]} for user ${userId}:`, error);
      }
    }

    const message = await ctx.replyWithAnimation(langSelectionGif, {
      caption: '🌐 Выберите язык / Select language',
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    if ('message_id' in message) {
      this.userMessageIds[userId] = message.message_id;
    }
  }

  async handleLanguageChange(ctx: Context, language: string) {
    if (!ctx.from || !ctx.callbackQuery) {
      if (ctx.from) await this.showLanguageSelection(ctx);
      return;
    }
    const userId = ctx.from.id;

    this.logger.debug(`[LANG] Starting language change to ${language} for user ${userId}`);

    const l = this.getLocalization(language);
    const messageId = this.getMessageIdToEdit(ctx);

    if (!messageId) {
      this.logger.warn(`[LANG] No messageId found to edit in handleLanguageChange for user ${userId}. Sending new language selection.`);
      await this.showLanguageSelection(ctx);
      return;
    }

    try {
      const user = await this.databaseService.getUserById(userId.toString());
      this.logger.debug(`[LANG] Current user language: ${user?.language}, changing to: ${language}`);

      await this.databaseService.updateUserLanguage(userId.toString(), language);
      this.logger.debug(`[LANG] Language updated in database for user ${userId}`);

      const updatedUser = await this.databaseService.getUserById(userId.toString());
      this.logger.debug(`[LANG] Updated user language in DB: ${updatedUser?.language}`);
      if (!this.channelId) {
        this.logger.error('CRITICAL: channelId is not set for subscription check!');
        await ctx.telegram.editMessageCaption(ctx.chat?.id, messageId, undefined, l.errors.general, { reply_markup: { inline_keyboard: [] } });
        return;
      }

      const chatMember = await ctx.telegram.getChatMember(this.channelId, userId);
      const isSubscribed = ['member', 'administrator', 'creator'].includes(chatMember.status);

      if (isSubscribed) {
        await this.databaseService.updateSubscriptionStatus(userId.toString(), true);
        
        // Удаляем сообщение выбора языка
        try {
          await ctx.deleteMessage(messageId);
          this.logger.log(`Deleted language selection message ${messageId} for user ${userId}`);
        } catch (deleteError) {
          this.logger.warn(`Could not delete language selection message ${messageId}:`, deleteError);
        }
        
        await this.showMainMenu(ctx, true);
      } else {
        const keyboard = {
          inline_keyboard: [
            [{ text: l.buttons.subscribeToChannel || '📢 Подписаться на канал', url: this.channelUrl }],
            [{ text: l.buttons.checkSubscription || '✅ Проверить подписку', callback_data: 'check_subscription' }],
          ],
        };

        if (ctx.callbackQuery?.message) {
          const chatId = ctx.callbackQuery.message.chat.id;
          const messageId = ctx.callbackQuery.message.message_id;

          try {
            await ctx.telegram.editMessageMedia(
              chatId,
              messageId,
              undefined,
              {
                type: 'animation',
                media: SUBSCRIBE_REQUEST_GIF,
                caption: l.subscribeRequest || '📢 Для использования бота необходимо подписаться на наш канал!',
                parse_mode: 'HTML',
              },
              { reply_markup: keyboard },
            );
            this.logger.log(`Edited message ${messageId} for user ${userId} to show subscription request with GIF: ${SUBSCRIBE_REQUEST_GIF}`);
          } catch (error) {
            if (this.userMessageIds[userId] === messageId) {
              try {
                await ctx.deleteMessage(messageId);
              } catch (e) {
                this.logger.warn('Could not delete old msg');
              }
            }
            const newMessage = await ctx.replyWithAnimation(SUBSCRIBE_REQUEST_GIF, {
              caption: l.subscribeRequest || '📢 Для использования бота необходимо подписаться на наш канал!',
              parse_mode: 'HTML',
              reply_markup: keyboard,
            });
            if ('message_id' in newMessage) this.userMessageIds[userId] = newMessage.message_id;
            this.logger.log(`Sent new message with subscription request GIF for user ${userId}: ${SUBSCRIBE_REQUEST_GIF}`);
          }
        } else {
          const newMessage = await ctx.replyWithAnimation(SUBSCRIBE_REQUEST_GIF, {
            caption: l.subscribeRequest || '📢 Для использования бота необходимо подписаться на наш канал!',
            parse_mode: 'HTML',
            reply_markup: keyboard,
          });
          if ('message_id' in newMessage) this.userMessageIds[userId] = newMessage.message_id;
          this.logger.log(`Sent new message with subscription request GIF (no callbackQuery.message) for user ${userId}: ${SUBSCRIBE_REQUEST_GIF}`);
        }
      }
    } catch (error) {
      try {
        await ctx.telegram.editMessageCaption(ctx.chat?.id, messageId, undefined, l.errors.general, { reply_markup: { inline_keyboard: [] } });
      } catch (editError) {
        this.logger.error('Failed to edit message with error in handleLanguageChange:', editError);
      }
    }
  }

  async handleCheckSubscription(ctx: Context) {
    if (!ctx.from || !ctx.callbackQuery) {
      return;
    }
    const userId = ctx.from.id;

    const user = await this.databaseService.getUserById(userId.toString());
    if (!user) {
      await this.showLanguageSelection(ctx);
      return;
    }
    const l = this.getLocalization(user.language);
    const messageId = this.getMessageIdToEdit(ctx);

    if (!messageId) {
      await this.showLanguageSelection(ctx);
      return;
    }

    try {
      if (!this.channelId) {
        await ctx.answerCbQuery(l.errors.general);
        return;
      }
      const chatMember = await ctx.telegram.getChatMember(this.channelId, userId);
      const isSubscribed = ['member', 'administrator', 'creator'].includes(chatMember.status);

      if (isSubscribed) {
        await this.databaseService.updateSubscriptionStatus(userId.toString(), true);
        await ctx.answerCbQuery(l.subscriptionSuccess || '✅ Отлично! Подписка подтверждена!');

        let messageSuccessfullyDeleted = false;
        if (ctx.callbackQuery?.message?.message_id && this.userMessageIds[userId] === ctx.callbackQuery.message.message_id) {
          try {
            await ctx.deleteMessage(this.userMessageIds[userId]);
            this.logger.log(`Successfully deleted message ${this.userMessageIds[userId]} in handleCheckSubscription for user ${userId}`);
            delete this.userMessageIds[userId];
            messageSuccessfullyDeleted = true;
          } catch (e) {
            this.logger.warn(`Could not delete subscription message ${this.userMessageIds[userId]} for user ${userId}:`, e);
          }
        }

        if (messageSuccessfullyDeleted) {
          await this.showMainMenu(ctx, false);
        } else {
          await this.showMainMenu(ctx, true, messageId);
        }
      } else {
        await ctx.answerCbQuery(l.subscriptionFailed || '❌ Подписка не найдена. Пожалуйста, подпишитесь.');
      }
    } catch (error) {
      const lang = user?.language || 'ru';
      const l = this.getLocalization(lang);
      await ctx.answerCbQuery(l.errors.general || 'Ошибка при проверке подписки.');
    }
  }

  async showMainMenu(ctx: Context, editMessage = true, messageIdToEdit?: number) {
    try {
      if (!ctx.from || !ctx.chat) return;
      const userId = ctx.from.id.toString();
      const chatId = ctx.chat.id;
      const user = await this.databaseService.getUserById(userId);
      const language = user ? user.language : 'ru';

      if (!(userId in this.bannerIndex)) {
        this.bannerIndex[userId] = 0;
      }
      if (!(userId in this.isPlaying)) {
        this.isPlaying[userId] = false;
      }

      const games = await this.databaseService.getEnabledGames();
      if (!games || games.length === 0) {
        this.logger.error(`No games found in database for banners`);
        await ctx.reply('📛 Игры не загружены. Пожалуйста, добавьте хотя бы одну игру.');
        return;
      }

      if (this.bannerIndex[userId] >= games.length) {
        this.bannerIndex[userId] = 0;
      }

      // Фильтруем только валидные игры с title и gif
      const validGames = games.filter(game => game.title && game.gifUrl);
      if (validGames.length === 0) {
        this.logger.error('No valid games found in database for banners');
        // Фоллбэк игра
        const fallbackGame = {
          id: 'default-game',
          title: 'Default Game',
          emoji: '🎮',
          image: 'https://via.placeholder.com/300x200',
          gifUrl: 'https://media.giphy.com/media/3o7TKUM3igRBf64NfO/giphy.gif',
          hasDiscount: false,
          isActive: true,
          enabled: true,
          isActual: true,
          category: 'Action' as const,
          rank: 999,
          tags: ['default'],
          appStoreUrl: 'https://apps.apple.com',
          googlePlayUrl: 'https://play.google.com',
          trailerUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const menuTextFallback = `${fallbackGame.title} ${fallbackGame.emoji || ''}`;
        const keyboardFallback = this.getMainMenuKeyboard(language, userId, fallbackGame);
        try {
          if (editMessage && messageIdToEdit && chatId) {
            await ctx.telegram.editMessageMedia(chatId, messageIdToEdit, undefined, { type: 'animation', media: fallbackGame.gifUrl, caption: menuTextFallback, parse_mode: 'HTML' }, { reply_markup: keyboardFallback });
            await this.storeMessageId(ctx, { message_id: messageIdToEdit });
          } else {
            const sentMessage = await ctx.replyWithAnimation(fallbackGame.gifUrl, { caption: menuTextFallback, parse_mode: 'HTML', reply_markup: keyboardFallback });
            await this.storeMessageId(ctx, sentMessage);
          }
        } catch (error) {
          this.logger.error('Error sending fallback game in showMainMenu:', error);
          await ctx.reply(menuTextFallback, { parse_mode: 'HTML', reply_markup: keyboardFallback });
        }
        return;
      }

      this.bannerIndex[userId] = this.bannerIndex[userId] % validGames.length;
      const currentGame = validGames[this.bannerIndex[userId]];

      // Дополнительная проверка на случай undefined
      if (!currentGame || !currentGame.title) {
        this.logger.error(`Current game is undefined or has no title. Index: ${this.bannerIndex[userId]}, ValidGames length: ${validGames.length}`);
        this.bannerIndex[userId] = 0;
        const fallbackGame = validGames[0] || {
          id: 'default-game',
          title: 'Default Game',
          emoji: '🎮',
          image: 'https://via.placeholder.com/300x200',
          gifUrl: 'https://media.giphy.com/media/3o7TKUM3igRBf64NfO/giphy.gif',
          hasDiscount: false,
          isActive: true,
          enabled: true,
          isActual: true,
          category: 'Action' as const,
          rank: 999,
          tags: ['default'],
          appStoreUrl: 'https://apps.apple.com',
          googlePlayUrl: 'https://play.google.com',
          trailerUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const menuText = `${fallbackGame.title} ${fallbackGame.emoji || ''}`;
        const keyboard = this.getMainMenuKeyboard(language, userId, fallbackGame);
        try {
          const sentMessage = await ctx.replyWithAnimation(fallbackGame.gifUrl, { caption: menuText, parse_mode: 'HTML', reply_markup: keyboard });
          await this.storeMessageId(ctx, sentMessage);
        } catch (error) {
          this.logger.error('Error sending fallback game in showMainMenu (currentGame undefined):', error);
          await ctx.reply(menuText, { parse_mode: 'HTML', reply_markup: keyboard });
        }
        return;
      }

      const menuText = `${currentGame.title} ${currentGame.emoji || ''}`;
      this.logger.log(`Showing main menu for user ${userId}. Language: ${language}.`);
      this.logger.debug(`Current banner text: "${menuText}", animation URL: "${currentGame.gifUrl}"`);

      const keyboard = this.getMainMenuKeyboard(language, userId, currentGame);
      const persistentKeyboard = this.getPersistentKeyboard(language);

      const messageId = messageIdToEdit ?? this.getMessageIdToEdit(ctx);

      try {
        if (editMessage && messageId && chatId) {
          try {
            await ctx.telegram.editMessageMedia(chatId, messageId, undefined, { type: 'animation', media: currentGame.gifUrl, caption: menuText, parse_mode: 'HTML' }, { reply_markup: keyboard });
            await this.storeMessageId(ctx, { message_id: messageId });
          } catch (mediaError) {
            this.logger.error('Error editing media in showMainMenu:', mediaError);
            try {
              await ctx.telegram.editMessageCaption(chatId, messageId, undefined, menuText, { reply_markup: keyboard, parse_mode: 'HTML' });
              await this.storeMessageId(ctx, { message_id: messageId });
            } catch (captionError) {
              this.logger.error('Error editing caption in showMainMenu:', captionError);
              const sentMessage = await ctx.replyWithAnimation(currentGame.gifUrl, { caption: menuText, parse_mode: 'HTML', reply_markup: keyboard });
              await this.storeMessageId(ctx, sentMessage);
            }
          }
        } else {
          this.logger.warn(`Could not edit message in showMainMenu (editMessage: ${editMessage}, messageId: ${messageId}, chatId: ${chatId}). Sending new one.`);
          const sentMessage = await ctx.replyWithAnimation(currentGame.gifUrl, { caption: menuText, parse_mode: 'HTML', reply_markup: keyboard });
          await this.storeMessageId(ctx, sentMessage);
        }
      } catch (error) {
        this.logger.error('Error in showMainMenu sending/editing message:', error);
        const sentMessage = await ctx.replyWithAnimation(currentGame.gifUrl, { caption: menuText, parse_mode: 'HTML', reply_markup: keyboard });
        await this.storeMessageId(ctx, sentMessage);
      }
    } catch (error) {
      this.logger.error('Error in showMainMenu:', error);
    }
  }

  public getPersistentKeyboard(language: string) {
    const menuText = language === 'ru' ? '🏠 Меню' : '🏠 Menu';
    const supportText = language === 'ru' ? '👨‍💻 Поддержка' : '👨‍💻 Support';
    
    return {
      keyboard: [
        [
          { text: menuText },
          { text: supportText }
        ]
      ],
      resize_keyboard: true,
      persistent: true
    };
  }

  public getMainMenuKeyboard(language: string, userId: string, currentGame: any = { title: '', gifUrl: '', googlePlayUrl: '', appStoreUrl: '' }): { inline_keyboard: Array<Array<any>> } {
    this.logger.debug(`[MENU] Building keyboard for language: ${language}`);

    const l = this.getLocalization(language);
    const shareText = `@${process.env.BOT_USERNAME || 'Tiptop_dev_bot'}?start=${userId}`;

    return {
      inline_keyboard: [
        [
          { text: '🤖 Google Play', url: currentGame.googlePlayUrl || 'https://play.google.com' },
          { text: '🍎 App Store', url: currentGame.appStoreUrl || 'https://apps.apple.com' },
        ],
        [
          { text: '⏮', callback_data: 'banner_prev' },
          { text: this.isPlaying[userId] ? '⏹' : '▶️', callback_data: this.isPlaying[userId] ? 'banner_stop' : 'banner_play' },
          { text: '⏭', callback_data: 'banner_next' },
        ],
        [
          { text: l.buttons.catalog, url: 'https://t.me/mobile_games_tp' },
          { text: l.buttons.news, url: 'https://t.me/tiptop_mgn' },
        ],
        [
          { text: l.buttons.cabinet, callback_data: 'cabinet' },
          { text: l.buttons.about, callback_data: 'about' },
        ],
        [
          { text: l.buttons.support, url: SUPPORT_URL },
          { text: l.buttons.reviews, callback_data: 'reviews' },
        ],
        [
          { text: l.buttons.menu, callback_data: 'back_to_menu' },
          { text: l.buttons.share, switch_inline_query: shareText },
        ],
        [
          { text: language === 'ru' ? '🇬🇧 English' : '🇷🇺 Русский', callback_data: language === 'ru' ? 'lang_en' : 'lang_ru' },
        ],
      ],
    };
  }

  public getMessageIdToEdit(ctx: Context): number | undefined {
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
      return ctx.callbackQuery.message.message_id;
    }
    return undefined;
  }

  public async storeMessageId(ctx: Context, message: any) {
    if (!ctx.from) return;
    const userId = ctx.from.id.toString();
    if ('message_id' in message) {
      this.userMessageIds[userId] = message.message_id;
    }
  }

  // Methods for handling bot actions
  public async handleCabinet(ctx: Context) {
    if (!ctx.from || !ctx.chat) return;

    const userId = ctx.from.id.toString();
    const user = await this.databaseService.getUserById(userId);
    const language = user?.language ?? 'ru';
    const l = this.getLocalization(language);

    const balance = user?.balance ?? 0;
    const ordersCount = user?.ordersCount ?? 0;
    const referralCount = user?.referrals?.length ?? 0;
    const referralPurchasesCount = user?.referrals?.reduce((sum, ref) => sum + (ref.purchasesCount ?? 0), 0) ?? 0;
    const refPercent = user?.refPercent ?? 1;
    const referralLink = `https://t.me/${process.env.BOT_USERNAME || 'Tiptop_dev_bot'}?start=${userId}`;
    const username = ctx.from?.username ? `@${ctx.from.username}` : '';

    const cabinetText = language === 'ru'
      ? `💼 ${l.cabinet.title}
👤 ${l.cabinet.user} ${username || 'Пользователь'}
🆔 ${l.cabinet.id} ${userId}
📦 ${l.cabinet.orders} ${ordersCount}
🤝 Реф. программа
💎 ${l.cabinet.percent} ${refPercent}%
👥 ${l.cabinet.referrals} ${referralCount}
🛍 Покупки рефералов: ${referralPurchasesCount}
💰 ${l.cabinet.balance} ${balance} $
🔗 ${l.cabinet.link} ${referralLink}`
      : `💼 ${l.cabinet.title}
👤 ${l.cabinet.user} ${username || 'User'}
🆔 ${l.cabinet.id} ${userId}
📦 ${l.cabinet.orders} ${ordersCount}
🤝 Referral Program
💎 ${l.cabinet.percent} ${refPercent}%
👥 ${l.cabinet.referrals} ${referralCount}
🛍 ${(l.cabinet as any).referralPurchases || 'Purchases'}: ${referralPurchasesCount}
💰 ${l.cabinet.balance} ${balance} $
🔗 ${l.cabinet.link} ${referralLink}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: language === 'ru' ? '📦 Заказы' : '📦 Orders', callback_data: 'orders' },
          { text: language === 'ru' ? '🤝 Реф. программа' : '🤝 Referral Program', callback_data: 'deposit_usdt' },
        ],
        [
          { text: language === 'ru' ? '🔄 Обновить' : '🔄 Update', callback_data: 'refresh_cabinet' },
          { text: language === 'ru' ? '💸 Вывести' : '💸 Withdraw', callback_data: 'withdraw' },
        ],
        [
          { text: language === 'ru' ? '⬅️ Назад' : '⬅️ Back', callback_data: 'back_to_menu' },
        ],
      ],
    };

    const messageId = this.getMessageIdToEdit(ctx);

    try {
      // Получаем фото профиля пользователя
      const photos = await ctx.telegram.getUserProfilePhotos(Number(userId), 0, 1);
      const photoId = photos.photos[0]?.[0]?.file_id;

      if (messageId && ctx.chat) {
        if (photoId) {
          // Если есть аватар, обновляем сообщение с фото
          await ctx.telegram.editMessageMedia(
            ctx.chat.id,
            messageId,
            undefined,
            {
              type: 'photo',
              media: photoId,
              caption: cabinetText,
              parse_mode: 'HTML',
            },
            { reply_markup: keyboard }
          );
        } else {
          // Если нет аватара, обновляем текст
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            messageId,
            undefined,
            cabinetText,
            {
              reply_markup: keyboard,
              parse_mode: 'HTML',
            }
          );
        }
        await this.storeMessageId(ctx, { message_id: messageId });
      } else {
        // Отправляем новое сообщение
        let sentMessage;
        if (photoId) {
          sentMessage = await ctx.replyWithPhoto(photoId, {
            caption: cabinetText,
            reply_markup: keyboard,
            parse_mode: 'HTML',
          });
        } else {
          sentMessage = await ctx.reply(cabinetText, {
            reply_markup: keyboard,
            parse_mode: 'HTML',
          });
        }
        await this.storeMessageId(ctx, sentMessage);
      }
    } catch (error: any) {
      if (error.message?.includes('message is not modified')) {
        this.logger.debug(`No changes in cabinet data for user ${userId}`);
        // Игнорируем ошибку, так как данные не изменились
      } else {
        this.logger.error(`Error in handleCabinet for user ${userId}:`, error);
        // Fallback: отправляем новое сообщение
        const fallback = await ctx.reply(cabinetText, {
          reply_markup: keyboard,
          parse_mode: 'HTML',
        });
        await this.storeMessageId(ctx, fallback);
      }
    }
  }


  public async handleBannerControl(ctx: Context, action: string) {
    if (!ctx.from || !ctx.chat) return;
    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id;
    const user = await this.databaseService.getUserById(userId);
    const language = user ? user.language : 'ru';
    const l = this.getLocalization(language);

    const games = await this.databaseService.getEnabledGames();
    if (!games || games.length === 0) {
      await ctx.reply(l.errors.general || '📛 Игры не загружены. Пожалуйста, попробуйте позже.');
      return;
    }

    const messageId = this.getMessageIdToEdit(ctx);
    if (!messageId) {
      this.logger.warn(`[BANNER] No messageId found for user ${userId} in handleBannerControl`);
      await this.showMainMenu(ctx, false);
      return;
    }

    // Обновляем время последней активности для слайд-шоу
    const slideshowData = this.slideshowIntervals.get(userId);
    if (slideshowData) {
      slideshowData.lastInteractionTime = Date.now();
      this.slideshowIntervals.set(userId, slideshowData);
    }

    switch (action) {
      case 'prev':
        this.bannerIndex[userId] = (this.bannerIndex[userId] - 1 + games.length) % games.length;
        await this.showMainMenu(ctx, true, messageId);
        break;
      case 'next':
        this.bannerIndex[userId] = (this.bannerIndex[userId] + 1) % games.length;
        await this.showMainMenu(ctx, true, messageId);
        break;
      case 'play':
        await this.startSlideshow(ctx, userId, chatId, messageId, language);
        await ctx.answerCbQuery(l.slideshow?.started || '▶️ Автопрокрутка запущена');
        break;
      case 'stop':
        const wasPlaying = await this.stopSlideshow(userId, chatId, messageId, language);
        if (wasPlaying) {
          await ctx.answerCbQuery(l.slideshow?.stoppedManual || '⏹️ Автопрокрутка остановлена');
        }
        break;
      default:
        this.logger.warn(`[BANNER] Unknown action ${action} for user ${userId}`);
    }
  }

  public async handleRefreshCabinet(ctx: Context) {
    if (!ctx.from) return;
    const userId = ctx.from.id.toString();
    const user = await this.databaseService.getUserById(userId);
    const language = user?.language || 'ru';
    const l = this.getLocalization(language);
    
    await ctx.answerCbQuery(l.cabinet.refreshButton || '🔄 Данные обновлены');
    await this.handleCabinet(ctx);
  }

  public async handleOrders(ctx: Context) {
    if (!ctx.from || !ctx.chat) return;
    const userId = ctx.from.id.toString();
    const user = await this.databaseService.getUserById(userId);
    const language = user?.language || 'ru';
    const l = this.getLocalization(language);
    
    const messageId = this.getMessageIdToEdit(ctx);
    const ordersText = `${l.orders.title}${l.orders.empty}`;
      
    const keyboard = {
      inline_keyboard: [
        [{ text: l.cabinet.backButton, callback_data: 'cabinet' }]
      ]
    };
    
    if (messageId && ctx.chat) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        messageId,
        undefined,
        ordersText,
        { reply_markup: keyboard, parse_mode: 'HTML' }
      );
      await this.storeMessageId(ctx, { message_id: messageId });
    } else {
      const sentMessage = await ctx.reply(ordersText, { reply_markup: keyboard, parse_mode: 'HTML' });
      await this.storeMessageId(ctx, sentMessage);
    }
  }

  public async handleBalance(ctx: Context) {
    if (!ctx.from || !ctx.chat) return;
    const userId = ctx.from.id.toString();
    const user = await this.databaseService.getUserById(userId);
    const language = user?.language || 'ru';
    const l = this.getLocalization(language);
    const balance = user?.balance || 0;
    
    const messageId = this.getMessageIdToEdit(ctx);
    const balanceText = `💰 ${l.cabinet.balance} ${balance} $`;
      
    const keyboard = {
      inline_keyboard: [
        [{ text: l.buttons.deposit || (language === 'ru' ? '💳 Пополнить USDT' : '💳 Deposit USDT'), callback_data: 'deposit_usdt' }],
        [{ text: l.buttons.withdraw || (language === 'ru' ? '💸 Вывести средства' : '💸 Withdraw funds'), callback_data: 'withdraw' }],
        [{ text: l.cabinet.backButton, callback_data: 'cabinet' }]
      ]
    };
    
    if (messageId && ctx.chat) {
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          messageId,
          undefined,
          balanceText,
          { reply_markup: keyboard, parse_mode: 'HTML' }
        );
        await this.storeMessageId(ctx, { message_id: messageId });
      } catch (error) {
        this.logger.error(`Error editing message in handleBalance:`, error);
        const sentMessage = await ctx.reply(balanceText, { reply_markup: keyboard, parse_mode: 'HTML' });
        await this.storeMessageId(ctx, sentMessage);
      }
    } else {
      const sentMessage = await ctx.reply(balanceText, { reply_markup: keyboard, parse_mode: 'HTML' });
      await this.storeMessageId(ctx, sentMessage);
    }
  }

  public async handleAbout(ctx: Context) {
    if (!ctx.from || !ctx.chat) return;
    const userId = ctx.from.id.toString();
    const user = await this.databaseService.getUserById(userId);
    const language = user?.language || 'ru';
    const l = this.getLocalization(language);
    
    const messageId = this.getMessageIdToEdit(ctx);
    const aboutText = language === 'ru'
      ? 'ℹ️ О нас\n\nМы - платформа для мобильных игр. Наша цель - предоставить вам лучшие игры и удобный сервис.'
      : 'ℹ️ About Us\n\nWe are a mobile gaming platform. Our goal is to provide you with the best games and convenient service.';
      
    const keyboard = {
      inline_keyboard: [
        [{ text: l.buttons.back, callback_data: 'back_to_menu' }]
      ]
    };
    
    if (messageId && ctx.chat) {
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          messageId,
          undefined,
          aboutText,
          { reply_markup: keyboard, parse_mode: 'HTML' }
        );
        await this.storeMessageId(ctx, { message_id: messageId });
      } catch (error) {
        this.logger.error(`Error editing message in handleAbout:`, error);
        const sentMessage = await ctx.reply(aboutText, { reply_markup: keyboard, parse_mode: 'HTML' });
        await this.storeMessageId(ctx, sentMessage);
      }
    } else {
      const sentMessage = await ctx.reply(aboutText, { reply_markup: keyboard, parse_mode: 'HTML' });
      await this.storeMessageId(ctx, sentMessage);
    }
  }

  public async handleSupport(ctx: Context) {
    if (!ctx.from || !ctx.chat) return;
    const userId = ctx.from.id.toString();
    const user = await this.databaseService.getUserById(userId);
    const language = user?.language || 'ru';
    const l = this.getLocalization(language);
    
    const messageId = this.getMessageIdToEdit(ctx);
    const supportText = language === 'ru'
      ? '🆘 Поддержка\n\nЕсли у вас есть вопросы или проблемы, свяжитесь с нами.'
      : '🆘 Support\n\nIf you have any questions or issues, contact us.';
      
    const keyboard = {
      inline_keyboard: [
        [{ text: language === 'ru' ? '📞 Связаться с поддержкой' : '📞 Contact Support', url: SUPPORT_URL }],
        [{ text: l.buttons.back, callback_data: 'back_to_menu' }]
      ]
    };
    
    if (messageId && ctx.chat) {
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          messageId,
          undefined,
          supportText,
          { reply_markup: keyboard, parse_mode: 'HTML' }
        );
        await this.storeMessageId(ctx, { message_id: messageId });
      } catch (error) {
        this.logger.error(`Error editing message in handleSupport:`, error);
        const sentMessage = await ctx.reply(supportText, { reply_markup: keyboard, parse_mode: 'HTML' });
        await this.storeMessageId(ctx, sentMessage);
      }
    } else {
      const sentMessage = await ctx.reply(supportText, { reply_markup: keyboard, parse_mode: 'HTML' });
      await this.storeMessageId(ctx, sentMessage);
    }
  }

  public async handleReviews(ctx: Context) {
    if (!ctx.from || !ctx.chat) return;
    const userId = ctx.from.id.toString();
    const user = await this.databaseService.getUserById(userId);
    const language = user?.language || 'ru';
    const l = this.getLocalization(language);
    
    const messageId = this.getMessageIdToEdit(ctx);
    const reviewsText = language === 'ru'
      ? '⭐ Отзывы\n\nВаши отзывы помогают нам становиться лучше!'
      : '⭐ Reviews\n\nYour feedback helps us improve!';
      
    const keyboard = {
      inline_keyboard: [
        [{ text: l.buttons.back, callback_data: 'back_to_menu' }]
      ]
    };
    
    if (messageId && ctx.chat) {
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          messageId,
          undefined,
          reviewsText,
          { reply_markup: keyboard, parse_mode: 'HTML' }
        );
        await this.storeMessageId(ctx, { message_id: messageId });
      } catch (error) {
        this.logger.error(`Error editing message in handleReviews:`, error);
        const sentMessage = await ctx.reply(reviewsText, { reply_markup: keyboard, parse_mode: 'HTML' });
        await this.storeMessageId(ctx, sentMessage);
      }
    } else {
      const sentMessage = await ctx.reply(reviewsText, { reply_markup: keyboard, parse_mode: 'HTML' });
      await this.storeMessageId(ctx, sentMessage);
    }
  }

  public async handleInlineQuery(ctx: Context) {
    if (!ctx.from) return;
    const userId = ctx.from.id.toString();
    const user = await this.databaseService.getUserById(userId);
    const language = user?.language || 'ru';
    const l = this.getLocalization(language);
    
    // Placeholder for inline query handling
    await ctx.answerInlineQuery([], {
      cache_time: 0,
      button: {
        text: l.buttons.share || 'Share Bot',
        start_parameter: userId
      }
    });
  }

  public async handleBackToMenu(ctx: Context) {
    if (!ctx.from) return;
    const userId = ctx.from.id.toString();
    const user = await this.databaseService.getUserById(userId);
    const language = user?.language || 'ru';
    const l = this.getLocalization(language);

    // Если плеер активен, показываем уведомление
    if (this.isPlaying[userId]) {
      await ctx.answerCbQuery(
        l.slideshow.alreadyPlaying || '⚠️ Stop slideshow first'
      );
      return;
    }

    // Останавливаем слайдшоу если оно запущено
    await this.stopSlideshow(userId);

    const messageId = this.getMessageIdToEdit(ctx);
    await this.showMainMenu(ctx, true, messageId);
  }
}
