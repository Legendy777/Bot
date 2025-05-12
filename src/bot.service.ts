import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup, Telegraf } from 'telegraf';
import { DatabaseService } from './database/database.service';
// import { TokenBotService } from './token.service'; // Закомментировано, пока не решена проблема с импортом
import { InlineQueryResultArticle, InlineQueryResultsButton } from 'telegraf/typings/core/types/typegram';
import { WELCOME_GIFS, GAME_CATEGORIES, SUPPORT_URL, BANNERS, SUBSCRIBE_REQUEST_GIF } from './config/constants';
import { Localization, localizations } from './bot/interfaces/localization.interface';
import { InjectBot } from 'nestjs-telegraf';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

// Интерфейс для игры
interface Game {
  id?: string;
  name: string;
  description?: string;
  imageUrl: string;
  playMarketLink?: string;
  appStoreLink?: string;
}

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
  private slideshowIntervals: Map<string, { intervalId: NodeJS.Timeout; timeoutId: NodeJS.Timeout; chatId: number; messageId: number; language: string; callbackQueryId: string; lastInteractionTime: number; }> = new Map();
  private isPlaying: { [key: string]: boolean } = {};
  private userMessageIds: { [key: string]: number } = {};

  constructor(
    private readonly databaseService: DatabaseService,
    // private readonly tokenService: TokenBotService, // Закомментировано
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

  private async stopSlideshow(userId: string, chatId?: number, messageId?: number, language?: string) {
    // Проверяем наличие userId, так как это обязательный параметр
    if (!userId) {
      this.logger.error(`[SLIDESHOW_DEBUG] stopSlideshow called without userId`);
      return false;
    }
    
    this.logger.debug(`[SLIDESHOW_DEBUG] stopSlideshow called for user ${userId}. Optional chatId: ${chatId}, messageId: ${messageId}, language: ${language}`);
    const slideshowData = this.slideshowIntervals.get(userId);

    if (slideshowData) {
        this.logger.debug(`[SLIDESHOW_DEBUG] Clearing interval (${slideshowData.intervalId}) and timeout (${slideshowData.timeoutId}) for user ${userId}`);
        clearInterval(slideshowData.intervalId);
        clearTimeout(slideshowData.timeoutId);
        this.slideshowIntervals.delete(userId);
    } else {
        this.logger.debug(`[SLIDESHOW_DEBUG] No active slideshow data found in map for user ${userId}`);
    }
    
    // Проверяем наличие userId в isPlaying
    const wasPlaying = userId in this.isPlaying ? this.isPlaying[userId] : false;
    this.isPlaying[userId] = false; 
    this.logger.debug(`[SLIDESHOW_DEBUG] Set isPlaying to false for user ${userId}.`);

    // Проверяем все необходимые параметры перед обновлением разметки
    if (chatId && messageId && language && wasPlaying) {
        this.logger.debug(`[SLIDESHOW_DEBUG] Attempting to update markup for user ${userId} in chat ${chatId}, message ${messageId} after auto-stop.`);
        try {
            const l = this.getLocalization(language);
            // Проверяем наличие метода getMainMenuKeyboard
            if (typeof this.getMainMenuKeyboard === 'function') {
                const keyboard = this.getMainMenuKeyboard(language, userId);
                
                // Проверяем, была ли автоматическая остановка по таймеру
                const isAutoStop = slideshowData && Date.now() - (slideshowData.lastInteractionTime || 0) > 30000;
                
                // Обновляем клавиатуру и добавляем сообщение об остановке в подпись, если это автоматическая остановка
                if (isAutoStop) {
                    // Получаем текущий баннер
                    const currentBanner = BANNERS[language][this.bannerIndex[userId] || 0];
                    const menuText = `${currentBanner.game}\n\n⏹️ ${l.slideshow?.stoppedTimer || 'Автопрокрутка остановлена по таймеру'}`;
                    
                    // Обновляем сообщение с новой подписью, включающей уведомление об остановке
                    await this.bot.telegram.editMessageCaption(
                        chatId, 
                        messageId, 
                        undefined, 
                        menuText, 
                        { reply_markup: keyboard, parse_mode: 'HTML' }
                    );
                    this.logger.debug(`[SLIDESHOW_DEBUG] Updated caption with auto-stop notification for user ${userId}`);
                } else {
                    // Просто обновляем клавиатуру
                    await this.bot.telegram.editMessageReplyMarkup(chatId, messageId, undefined, keyboard);
                    
                    // Пытаемся отправить уведомление через callback query, если он не устарел
                    if (slideshowData?.callbackQueryId) {
                        try {
                            await this.bot.telegram.answerCbQuery(slideshowData.callbackQueryId, l.slideshow?.stoppedManual || '⏹️ Автопрокрутка остановлена', { show_alert: false });
                            this.logger.debug(`[SLIDESHOW_DEBUG] Successfully sent stop notification for user ${userId} with callbackQueryId ${slideshowData.callbackQueryId}`);
                        } catch (cbError: any) {
                            this.logger.warn(`[SLIDESHOW_DEBUG] Failed to answer callback query: ${cbError.message}`);
                        }
                    } else {
                        this.logger.warn(`[SLIDESHOW_DEBUG] No callbackQueryId available for stop notification for user ${userId}`);
                    }
                }
                
                this.logger.debug(`[SLIDESHOW_DEBUG] Successfully updated markup for message ${messageId} after stop.`);
            } else {
                this.logger.warn(`[SLIDESHOW_DEBUG] getMainMenuKeyboard method not found`);
            }
        } catch (error: any) {
            this.logger.warn(`[SLIDESHOW_DEBUG] Failed to update markup for message ${messageId} after stop: ${error.message}`);
        }
    } else if (wasPlaying) {
        this.logger.debug(`[SLIDESHOW_DEBUG] Not updating markup due to missing parameters: chatId=${chatId}, messageId=${messageId}, language=${language}`);
    }
    return wasPlaying;
  }

  private initializeActions() {
    this.bot.action('cabinet', async (ctx) => {
      if (!ctx.from) return;
      await this.stopSlideshow(ctx.from.id.toString());
      await this.handleCabinet(ctx);
    });
    this.bot.action('banner_prev', async (ctx) => {
        if (!ctx.from) return;
        await this.stopSlideshow(ctx.from.id.toString()); 
        await this.handleBannerControl(ctx, 'prev');
    });
    this.bot.action('banner_next', async (ctx) => {
        if (!ctx.from) return;
        await this.stopSlideshow(ctx.from.id.toString());
        await this.handleBannerControl(ctx, 'next');
    });
    this.bot.action('banner_play', async (ctx) => {
        if (!ctx.from) return;
        await this.handleBannerControl(ctx, 'play');
    });
     this.bot.action('banner_stop', async (ctx) => {
        if (!ctx.from) return;
        await this.stopSlideshow(ctx.from.id.toString()); 
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
    this.bot.action('share', async (ctx) => {
      if (!ctx.from) return;
      await this.stopSlideshow(ctx.from.id.toString());
      await this.handleShare(ctx);
    });
    this.bot.action('back_to_menu', async (ctx) => {
      if (!ctx.from) return;
      await this.stopSlideshow(ctx.from.id.toString());
      await this.handleBackToMenu(ctx);
    });
    this.bot.action('refresh_cabinet', async (ctx) => {
      if (!ctx.from) return;
      await this.stopSlideshow(ctx.from.id.toString());
      await this.handleRefreshCabinet(ctx);
    });
    this.bot.action('orders', async (ctx) => {
      if (!ctx.from) return;
      await this.stopSlideshow(ctx.from.id.toString());
      await this.handleOrders(ctx);
    });
    this.bot.action('deposit_usdt', async (ctx) => {
      if (!ctx.from) return;
      await this.stopSlideshow(ctx.from.id.toString());
      await this.handleBalance(ctx);
    });
    this.bot.action('withdraw', async (ctx) => {
      if (!ctx.from) return;
      await this.stopSlideshow(ctx.from.id.toString());
      await this.handleBalance(ctx);
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

      let user = await this.databaseService.getUserById(userId);
      if (!user) {
        this.logger.log(`Creating new user ${userId}`);
        user = await this.databaseService.createUser(userId);
        if ('startPayload' in ctx && ctx.startPayload) {
          const referrerId = ctx.startPayload;
          if (referrerId && referrerId !== userId) {
            // await this.databaseService.addReferral(referrerId, userId); // Закомментировано, т.к. метод отсутствует
            this.logger.log(`User ${userId} was referred by ${referrerId} (addReferral logic needs to be implemented in DatabaseService)`);
          }
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

    const langSelectionGif = WELCOME_GIFS?.ru || 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHppdWQzb3MxbzNndjhlZTFiMHpwYnI3Z2l0dGp4czc4dGppZGJiYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/NjCzN2GiZFlLjgHJO4/giphy.gif';

    if (ctx.callbackQuery?.message?.message_id && this.userMessageIds[userId] === ctx.callbackQuery.message.message_id) {
        try {
            await ctx.deleteMessage(this.userMessageIds[userId]);
            this.logger.log(`Deleted previous message ${this.userMessageIds[userId]} for user ${userId} before showing language selection.`);
        } catch (error) {
            this.logger.warn(`Could not delete message ${this.userMessageIds[userId]} for user ${userId}:`, error);
        }
    }

    const message = await ctx.replyWithAnimation(
      langSelectionGif,
      {
        caption: '🌐 Выберите язык / Select language',
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );

    if ('message_id' in message) {
      this.userMessageIds[userId] = message.message_id;
    }
  }

  async handleLanguageChange(ctx: Context, language: string) {
    if (!ctx.from || !ctx.callbackQuery) {
        if(ctx.from) await this.showLanguageSelection(ctx);
        return;
    }
    const userId = ctx.from.id;

    const l = this.getLocalization(language);
    const messageId = this.getMessageIdToEdit(ctx);

    if (!messageId) {
        this.logger.warn(`No messageId found to edit in handleLanguageChange for user ${userId}. Sending new language selection.`);
        await this.showLanguageSelection(ctx);
        return;
    }

    try {
      await this.databaseService.updateUserLanguage(userId.toString(), language);
      if (!this.channelId) {
        this.logger.error('CRITICAL: channelId is not set for subscription check!');
        await ctx.telegram.editMessageCaption(ctx.chat?.id, messageId, undefined, l.errors.general, { reply_markup: { inline_keyboard: [] } });
        return;
      }

      const chatMember = await ctx.telegram.getChatMember(this.channelId, userId);
      const isSubscribed = ['member', 'administrator', 'creator'].includes(chatMember.status);

      if (isSubscribed) {
        await this.databaseService.updateSubscriptionStatus(userId.toString(), true);
        await this.showMainMenu(ctx, true, messageId);
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
              { type: 'animation', media: SUBSCRIBE_REQUEST_GIF, caption: l.subscribeRequest || '📢 Для использования бота необходимо подписаться на наш канал!', parse_mode: 'HTML' }, 
              { reply_markup: keyboard }
            );
            this.logger.log(`Edited message ${messageId} for user ${userId} to show subscription request with GIF: ${SUBSCRIBE_REQUEST_GIF}`);
          } catch (error) {
            if (this.userMessageIds[userId] === messageId) {
                 try { await ctx.deleteMessage(messageId); } catch(e){this.logger.warn("Could not delete old msg")}
            }
            const newMessage = await ctx.replyWithAnimation(
              SUBSCRIBE_REQUEST_GIF, 
              {
                caption: l.subscribeRequest || '📢 Для использования бота необходимо подписаться на наш канал!', 
                parse_mode: 'HTML', 
                reply_markup: keyboard
              }
            );
            if('message_id' in newMessage) this.userMessageIds[userId] = newMessage.message_id;
            this.logger.log(`Sent new message with subscription request GIF for user ${userId}: ${SUBSCRIBE_REQUEST_GIF}`);
          }
        } else {
            const newMessage = await ctx.replyWithAnimation(
              SUBSCRIBE_REQUEST_GIF, 
              {
                caption: l.subscribeRequest || '📢 Для использования бота необходимо подписаться на наш канал!', 
                parse_mode: 'HTML', 
                reply_markup: keyboard
              }
            );
            if('message_id' in newMessage) this.userMessageIds[userId] = newMessage.message_id;
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
        await ctx.answerCbQuery(l.errors.general, { show_alert: true });
        return;
      }
      const chatMember = await ctx.telegram.getChatMember(this.channelId, userId);
      const isSubscribed = ['member', 'administrator', 'creator'].includes(chatMember.status);

      if (isSubscribed) {
        await this.databaseService.updateSubscriptionStatus(userId.toString(), true);
        await ctx.answerCbQuery(l.subscriptionSuccess || '✅ Отлично! Подписка подтверждена!', { show_alert: true });
        
        let messageSuccessfullyDeleted = false;
        if (ctx.callbackQuery?.message?.message_id && this.userMessageIds[userId] === ctx.callbackQuery.message.message_id) {
            try { 
                await ctx.deleteMessage(this.userMessageIds[userId]);
                this.logger.log(`Successfully deleted message ${this.userMessageIds[userId]} in handleCheckSubscription for user ${userId}`);
                delete this.userMessageIds[userId];
                messageSuccessfullyDeleted = true;
            } catch(e) { 
                this.logger.warn(`Could not delete subscription message ${this.userMessageIds[userId]} for user ${userId}:`, e);
            }
        }

        if (messageSuccessfullyDeleted) {
            await this.showMainMenu(ctx, false);
        } else {
            await this.showMainMenu(ctx, true, messageId); 
        }
      } else {
        await ctx.answerCbQuery(l.subscriptionFailed || '❌ Подписка не найдена. Пожалуйста, подпишитесь.', { show_alert: true });
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

      if (!BANNERS[language] || BANNERS[language].length === 0) {
        this.logger.error(`No banners found for language: ${language}`);
        await ctx.reply('Ошибка загрузки баннеров. Пожалуйста, попробуйте позже.');
        return;
      }

      if (this.bannerIndex[userId] >= BANNERS[language].length) {
        this.bannerIndex[userId] = 0;
      }

      let currentBanner = BANNERS[language][this.bannerIndex[userId]];
      if (!currentBanner || !currentBanner.game || !currentBanner.animation) {
        this.logger.error(`Invalid banner at index ${this.bannerIndex[userId]} for language: ${language}. Resetting to 0.`);
        this.logger.debug(`Problematic banner data: ${JSON.stringify(currentBanner)}`);
        this.bannerIndex[userId] = 0;
        if (BANNERS[language].length > 0 && BANNERS[language][0] && BANNERS[language][0].game && BANNERS[language][0].animation) {
          currentBanner = BANNERS[language][0];
        } else {
          this.logger.error(`No valid banners found for language: ${language} even after reset.`);
          await ctx.reply('Ошибка загрузки баннеров. Пожалуйста, попробуйте позже.');
          return;
        }
      }

      const menuText = `${currentBanner.game}`;
      this.logger.log(`Showing main menu for user ${userId}. Language: ${language}.`);
      this.logger.debug(`Current banner text: "${menuText}", animation URL: "${currentBanner.animation}"`);

      const keyboard = this.getMainMenuKeyboard(language, userId);

      const messageId = messageIdToEdit ?? this.getMessageIdToEdit(ctx);

      try {
        if (editMessage && messageId && chatId) {
          await ctx.telegram.editMessageMedia(
            chatId, messageId, undefined,
            { type: 'animation', media: currentBanner.animation, caption: menuText, parse_mode: 'HTML' }, 
            { reply_markup: keyboard }
          );
          await this.storeMessageId(ctx, { message_id: messageId });
        } else {
          this.logger.warn(`Could not edit message in showMainMenu (editMessage: ${editMessage}, messageId: ${messageId}, chatId: ${chatId}). Sending new one.`);
          const sentMessage = await ctx.replyWithAnimation(currentBanner.animation, { caption: menuText, parse_mode: 'HTML', reply_markup: keyboard });
          await this.storeMessageId(ctx, sentMessage);
        }
      } catch (error) {
        this.logger.error('Error in showMainMenu sending/editing message:', error);
        try {
          if (editMessage && messageId && chatId) {
            await ctx.telegram.editMessageCaption(chatId, messageId, undefined, menuText, { reply_markup: keyboard, parse_mode: 'HTML'});
            await this.storeMessageId(ctx, { message_id: messageId });
          } else {
            const sentMessage = await ctx.reply(menuText, { parse_mode: 'HTML', reply_markup: keyboard });
            await this.storeMessageId(ctx, sentMessage);
          }
        } catch (textError) {
          this.logger.error('Error in showMainMenu text fallback:', textError);
        }
      }
    } catch (error) {
      this.logger.error('Error in showMainMenu:', error);
      if ('callback_query' in ctx) {
        await ctx.answerCbQuery('Произошла ошибка. Пожалуйста, попробуйте позже.');
      }
    }
  }

  async handleBannerControl(ctx: Context, action: 'prev' | 'next' | 'play' | 'stop') {
    if (!ctx.from) return; 
    const userId = ctx.from.id.toString();
    const user = await this.databaseService.getUserById(userId);
    const language = user ? user.language : 'ru';
    const l = this.getLocalization(language);

    const chatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat.id;
    const messageId = this.getMessageIdToEdit(ctx);
    const callbackQueryId = ctx.callbackQuery?.id;

    this.logger.debug(`[SLIDESHOW_DEBUG] handleBannerControl: action='${action}', userId=${userId}, chatId=${chatId}, messageId=${messageId}, lang=${language}`);

    try {
      if (!BANNERS[language] || BANNERS[language].length === 0) {
          this.logger.error(`No banners found for language: ${language} in handleBannerControl`);
          await ctx.answerCbQuery('Ошибка загрузки баннеров.', { show_alert: true });
          return;
      }

      switch (action) {
        case 'prev':
          this.bannerIndex[userId] = (this.bannerIndex[userId] - 1 + BANNERS[language].length) % BANNERS[language].length;
          // Обновляем callbackQueryId и lastInteractionTime при взаимодействии с prev
          if (callbackQueryId) {
              const currentData = this.slideshowIntervals.get(userId);
              if (currentData && this.isPlaying[userId]) {
                  this.slideshowIntervals.set(userId, {
                      ...currentData,
                      callbackQueryId: callbackQueryId,
                      lastInteractionTime: Date.now()
                  });
                  this.logger.debug(`[SLIDESHOW_DEBUG] Updated callbackQueryId to ${callbackQueryId} for prev action for user ${userId}`);
              }
          }
          break;
        case 'next':
          this.bannerIndex[userId] = (this.bannerIndex[userId] + 1) % BANNERS[language].length;
          // Обновляем callbackQueryId и lastInteractionTime при взаимодействии с next
          if (callbackQueryId) {
              const currentData = this.slideshowIntervals.get(userId);
              if (currentData && this.isPlaying[userId]) {
                  this.slideshowIntervals.set(userId, {
                      ...currentData,
                      callbackQueryId: callbackQueryId,
                      lastInteractionTime: Date.now()
                  });
                  this.logger.debug(`[SLIDESHOW_DEBUG] Updated callbackQueryId to ${callbackQueryId} for next action for user ${userId}`);
              }
          }
          break;
        case 'play':
          if (!chatId || !messageId) { 
             this.logger.error(`[SLIDESHOW_DEBUG] Cannot start slideshow for user ${userId}: Missing chatId or messageId.`);
             await ctx.answerCbQuery(l.errors.general || 'Ошибка запуска автопрокрутки.', { show_alert: true });
             break;
          }
          if (!this.isPlaying[userId]) {
              this.logger.debug(`[SLIDESHOW_DEBUG] Starting slideshow for user ${userId} in chat ${chatId}, message ${messageId}`);
              await this.stopSlideshow(userId); 
              this.isPlaying[userId] = true;

              // Получаем callbackQueryId из контекста
              let callbackQueryId = ctx.callbackQuery?.id || '';
              if (callbackQueryId) {
                  this.logger.debug(`[SLIDESHOW_DEBUG] Retrieved callbackQueryId ${callbackQueryId} from context for user ${userId}`);
              } else {
                  this.logger.warn(`[SLIDESHOW_DEBUG] No callbackQueryId available for user ${userId} when starting slideshow`);
              }
              
              // Сохраняем текущее время взаимодействия
              const lastInteractionTime = Date.now();
              this.logger.debug(`[SLIDESHOW_DEBUG] Saved interaction time ${lastInteractionTime} for user ${userId}`);
              

              const intervalId = setInterval(async () => {
                 const currentSlideshowData = this.slideshowIntervals.get(userId);
                 if (!currentSlideshowData) {
                     this.logger.warn(`[SLIDESHOW_DEBUG] Interval tick for user ${userId}, but no slideshow data found. Clearing interval.`);
                     clearInterval(intervalId);
                     return;
                 }
                 const currentChatId = currentSlideshowData.chatId;
                 const currentMessageId = currentSlideshowData.messageId;
                 const currentLanguage = currentSlideshowData.language;
                 
                 // Проверяем, не обновился ли callbackQueryId в другом месте
                 if (ctx.callbackQuery?.id && ctx.callbackQuery.id !== currentSlideshowData.callbackQueryId) {
                     // Обновляем callbackQueryId и время последнего взаимодействия
                     const updatedData = {
                         ...currentSlideshowData,
                         callbackQueryId: ctx.callbackQuery.id,
                         lastInteractionTime: Date.now()
                     };
                     this.slideshowIntervals.set(userId, updatedData);
                     this.logger.debug(`[SLIDESHOW_DEBUG] Updated callbackQueryId to ${ctx.callbackQuery.id} during interval tick for user ${userId}`);
                 }

                 this.bannerIndex[userId] = (this.bannerIndex[userId] + 1) % BANNERS[currentLanguage].length;
                 const nextBanner = BANNERS[currentLanguage][this.bannerIndex[userId]];
                 const nextMenuText = `${nextBanner.game}`; 
                 this.logger.debug(`[SLIDESHOW_DEBUG] Interval tick user ${userId}: New index ${this.bannerIndex[userId]}, next banner: ${nextMenuText}`);
                 if (!nextBanner || !nextBanner.animation) {
                     this.logger.error(`[SLIDESHOW_DEBUG] Interval tick user ${userId}: Invalid next banner data.`);
                     return;
                 }
                 
                 const keyboard = this.getMainMenuKeyboard(currentLanguage, userId); 
                 try {
                     await this.bot.telegram.editMessageMedia(
                        currentChatId, currentMessageId, undefined, 
                        { type: 'animation', media: nextBanner.animation, caption: nextMenuText, parse_mode: 'HTML' },
                        { reply_markup: keyboard }
                    );
                     this.logger.debug(`[SLIDESHOW_DEBUG] Interval tick user ${userId}: Successfully updated message ${currentMessageId}`);
                 } catch (error: any) {
                     this.logger.warn(`[SLIDESHOW_DEBUG] Interval tick user ${userId}: Failed to edit message ${currentMessageId}: ${error.message}`);
                 }
              }, 5000); 

              const timeoutId = setTimeout(async () => {
                 this.logger.debug(`[SLIDESHOW_DEBUG] 33s Timeout Fired for user ${userId}. Calling stopSlideshow with context and language.`);
                 const currentSlideshowData = this.slideshowIntervals.get(userId);
                 if (currentSlideshowData) {
                    // Проверяем наличие callbackQueryId перед остановкой
                    if (!currentSlideshowData.callbackQueryId && callbackQueryId) {
                        this.logger.debug(`[SLIDESHOW_DEBUG] Updating missing callbackQueryId ${callbackQueryId} for user ${userId} before auto-stop`);
                        // Обновляем данные с актуальным callbackQueryId
                        this.slideshowIntervals.set(userId, { ...currentSlideshowData, callbackQueryId });
                    }
                    
                    // Устанавливаем флаг автоматической остановки
                    const autoStopTime = Date.now();
                    // Обновляем данные с флагом автоматической остановки
                    this.slideshowIntervals.set(userId, { 
                        ...currentSlideshowData, 
                        lastInteractionTime: autoStopTime - 31000 // Гарантируем, что это будет считаться автоматической остановкой
                    });
                    
                    await this.stopSlideshow(userId, currentSlideshowData.chatId, currentSlideshowData.messageId, currentSlideshowData.language); 
                 }
              }, 33000); 

              // Сохраняем все данные, включая callbackQueryId и время последнего взаимодействия
              this.slideshowIntervals.set(userId, { intervalId, timeoutId, chatId, messageId, language, callbackQueryId, lastInteractionTime });
              
              await ctx.answerCbQuery(l.slideshow?.started || '▶️ Автопрокрутка запущена (33 сек)', { show_alert: false });
          } else {
              this.logger.debug(`[SLIDESHOW_DEBUG] Slideshow already playing for user ${userId}. Ignoring play command.`);
              await ctx.answerCbQuery(l.slideshow?.alreadyPlaying || '⚠️ Автопрокрутка уже активна', { show_alert: true }); 
          }
          break;
        case 'stop':
          // Получаем данные слайд-шоу для пользователя
          const slideshowData = this.slideshowIntervals.get(userId);
          
          // Если слайд-шоу активно, обновляем callbackQueryId и lastInteractionTime перед остановкой
          if (this.isPlaying[userId] && slideshowData && callbackQueryId) {
              // Обновляем данные с новым callbackQueryId и временем взаимодействия
              this.slideshowIntervals.set(userId, {
                  ...slideshowData,
                  callbackQueryId: callbackQueryId,
                  lastInteractionTime: Date.now()
              });
              this.logger.debug(`[SLIDESHOW_DEBUG] Updated callbackQueryId to ${callbackQueryId} before manual stop for user ${userId}`);
          }
          
          // Останавливаем слайд-шоу
          if (this.isPlaying[userId]) {
              await this.stopSlideshow(userId, chatId, messageId, language);
          }
          
          // Используем callbackQueryId из текущего контекста или из обновленных данных слайд-шоу
          const cbQueryId = callbackQueryId || slideshowData?.callbackQueryId;
          
          if (!cbQueryId) {
              this.logger.warn(`[SLIDESHOW_DEBUG] Cannot answer CbQuery for manual stop: Missing callbackQueryId for user ${userId}.`);
          } else {
              try {
                  await ctx.answerCbQuery(l.slideshow?.stoppedManual || '⏹️ Автопрокрутка остановлена', { show_alert: false });
                  this.logger.debug(`[SLIDESHOW_DEBUG] Successfully sent stop notification for user ${userId} with callbackQueryId ${cbQueryId}`);
              } catch (cbError: any) {
                  this.logger.warn(`[SLIDESHOW_DEBUG] Failed to answer callback query for stop action: ${cbError.message}`);
              }
          }
          break;
      }
      
      if (messageId) {
        await this.showMainMenu(ctx, true, messageId); 
      } else {
         this.logger.warn(`[SLIDESHOW_DEBUG] handleBannerControl (action: ${action}): Cannot call showMainMenu, messageId is missing.`);
      }

    } catch (error) {
      this.logger.error('Error in handleBannerControl:', error);
      await ctx.answerCbQuery('Произошла ошибка управления баннером.');
    }
  }

  async handleInlineQuery(ctx: Context) {
    try {
      if (!ctx.inlineQuery || !ctx.from) {
        this.logger.warn('No inlineQuery or ctx.from in handleInlineQuery');
        return;
      }

      const query = ctx.inlineQuery.query.toLowerCase();
      const offset = parseInt(ctx.inlineQuery.offset) || 0;
      const userId = ctx.from.id.toString();
      const user = await this.databaseService.getUserById(userId);
      const language = user?.language || 'ru';
      const l = this.getLocalization(language);

      const results: InlineQueryResultArticle[] = [];

      // 1. Логика шаринга баннеров
      if (!query || query.startsWith('share')) {
        const currentBanner = BANNERS[language][this.bannerIndex[userId] || 0];
        const tokens = { amount: 0 }; // Заглушка, так как TokenBotService отсутствует
        const inlineQuery: InlineQueryResultArticle = {
          type: 'article',
          id: '1',
          title: l.share.title,
          description: currentBanner?.game || l.share.description,
          input_message_content: {
            message_text: `🎮 ${currentBanner?.game || 'Игровой бот'}\n\n💎 У меня уже ${tokens.amount} токенов!\n\n🎯 Присоединяйся к игре и получи бонус:\nhttps://t.me/${process.env.BOT_USERNAME}?start=${userId}`,
            parse_mode: 'HTML' as const,
          },
        };
        results.push(inlineQuery);
      }
      // 2. Логика категорий игр
      else if (query.startsWith('category')) {
        const categoriesForLang: Record<string, Category> = GAME_CATEGORIES[language];
        if (!categoriesForLang) {
          this.logger.warn(`No game categories for language: ${language}`);
          await ctx.answerInlineQuery([], { cache_time: 10 });
          return;
        }
        results.push(
          ...Object.entries(categoriesForLang)
            .filter(([_, categoryDetails]) => categoryDetails.name.toLowerCase().includes(query.replace('category', '')))
            .map(([categoryKey, categoryDetails]) => ({
              type: 'article' as const,
              id: categoryKey,
              title: `${categoryDetails.emoji} ${categoryDetails.name}`,
              input_message_content: {
                message_text: `${l.categories.selected} ${categoryDetails.name}`,
                parse_mode: 'HTML' as const,
              },
              description: categoryDetails.name,
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: l.buttons.play,
                    web_app: { url: `${process.env.WEB_APP_URL}/games/${categoryKey}?userId=${userId}` },
                  },
                ]],
              },
            })),
        );
      }
      // 3. Логика поиска игр
      else {
        const games: Game[] = await this.databaseService.findGames();
        const filteredGames = games.filter((game) => game.name.toLowerCase().includes(query));
        results.push(
          ...filteredGames.slice(offset, offset + 50).map((game) => ({
            type: 'article' as const,
            id: String(game.id),
            title: game.name,
            description: game.description || '📱 Мобильная игра',
            thumb_url: game.imageUrl || 'https://example.com/placeholder.jpg',
            thumb_width: 300,
            thumb_height: 300,
            input_message_content: {
              message_text: `🎮 <b>${game.name}</b> 🎮\n\n${game.description || ''}\n<a href='${game.imageUrl}'></a>`,
              parse_mode: 'HTML' as const,
            },
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🤖 Play Market', url: game.playMarketLink || 'https://play.google.com' },
                  { text: '🍎 App Store', url: game.appStoreLink || 'https://apps.apple.com' },
                ],
                [
                  { text: '🛍 Магазин', url: 'https://t.me/TipTop999_bot/Games' },
                  { text: '🤖 Бот', url: 'https://t.me/TipTop999_bot' },
                ],
              ],
            },
          })),
        );
      }

      const nextOffset = offset + 50 < results.length ? String(offset + 50) : '';
      const button: InlineQueryResultsButton = {
        text: l.buttons.switchPm,
        start_parameter: 'start',
      };
      await ctx.answerInlineQuery(results, {
        next_offset: nextOffset,
        button,
        cache_time: 300,
      });
    } catch (error) {
      this.logger.error('Error in handleInlineQuery:', error);
    }
  }

  async handleShare(ctx: Context) {
    if (!ctx.from || !ctx.chat) {
        return;
    }
    const userId = ctx.from.id;

    try {
      const user = await this.databaseService.getUserById(userId.toString());
      const language = user?.language || 'ru';
      const l = this.getLocalization(language);

      const currentBanner = BANNERS[language][this.bannerIndex[userId] || 0];
      const shareText = `🎮 ${currentBanner.game}\n\n🎯 ${l.share.description}\n\n👉 https://t.me/${process.env.BOT_USERNAME}?start=${userId}`;

      await ctx.telegram.sendMessage(
        ctx.chat.id,
        l.share.message,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: l.share.button,
                  switch_inline_query: shareText,
                },
              ],
              [
                {
                  text: l.buttons.back,
                  callback_data: 'back_to_menu',
                },
              ],
            ],
          },
        },
      );

      if ('callback_query' in ctx) {
        await ctx.answerCbQuery();
      }
    } catch (error) {
      const language = ctx.from?.id ? (await this.databaseService.getUserById(ctx.from.id.toString()))?.language || 'ru' : 'ru';
      const l = this.getLocalization(language);
      this.logger.error('Error in handleShare:', error);
      if ('callback_query' in ctx) {
        await ctx.answerCbQuery(l.errors.shareError, { show_alert: true });
      }
    }
  }

  async handleProfile(ctx: Context) {
    try {
      if (!ctx.from) return;
      const userId = ctx.from.id.toString();
      const user = await this.databaseService.getUserById(userId);

      if (!user) {
        return await ctx.reply('Профиль не найден. Пожалуйста, начните с команды /start');
      }

      const orders = await this.databaseService.getOrders(userId);
      const l = this.getLocalization(user.language);

      const message =
        `${l.cabinet.title}:\n\n` +
        `🆔 ID: ${userId}\n` +
        `💰 USDT: ${user.balance}\n` +
        `📦 ${l.cabinet.orders}: ${orders.length}\n` +
        `👥 ${l.cabinet.referrals}: ${user.referrals?.length || 0}`;

      await ctx.reply(message);
    } catch (error) {
      this.logger.error('Error in handleProfile:', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    }
  }

  async handleOrders(ctx: Context) {
    if (!ctx.from) {
        return;
    }
    const userId = ctx.from.id;

    try {
      const orders = await this.databaseService.getOrders(userId.toString());

      if (!orders || orders.length === 0) {
        return await ctx.reply('У вас пока нет заказов');
      }

      const message = orders
        .map((order) => {
          const date =
            order.createdAt instanceof Date
              ? order.createdAt.toLocaleString()
              : new Date(order.createdAt).toLocaleString();

          return (
            `📦 Заказ #${order._id}\n` +
            `📅 Дата: ${date}\n` +
            `💰 Сумма: ${order.amount} USDT\n` +
            `📊 Статус: ${order.status}\n`
          );
        })
        .join('\n');

      await ctx.reply(message);
    } catch (error) {
      this.logger.error('Error in handleOrders:', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    }
  }

  async handleBalance(ctx: Context) {
    if (!ctx.from) {
        return;
    }
    const userId = ctx.from.id;

    try {
      const user = await this.databaseService.getUserById(userId.toString());
      const l = this.getLocalization(user?.language || 'ru');

      if (!user) {
        return await ctx.reply('Профиль не найден. Пожалуйста, начните с команды /start');
      }

      const message =
        '💰 Ваш баланс:\n\n' +
        `USDT: ${user.balance}\n\n` +
        '💳 Для пополнения баланса нажмите соответствующую кнопку:';

      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 Пополнить USDT', callback_data: 'deposit_usdt' }],
            [{ text: '💸 Вывести средства', callback_data: 'withdraw' }],
          ],
        },
      });
    } catch (error) {
      this.logger.error('Error in handleBalance:', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    }
  }

  async handleCabinet(ctx: Context) {
    if (!ctx.from) {
      if ('callback_query' in ctx && ctx.callbackQuery) {
        await ctx.answerCbQuery('Произошла ошибка: не удалось определить пользователя.', { show_alert: true });
      }
      return;
    }
    const userId = ctx.from.id;

    try {
      const user = await this.databaseService.getUserById(userId.toString());
      const l = this.getLocalization(user?.language || 'ru');
      this.logger.log(`Entering handleCabinet for user ${userId}. Language from DB: ${user?.language}, resolved localization to: ${user?.language || 'ru'}`);

      if (!user) {
        if ('callback_query' in ctx) {
          await ctx.answerCbQuery(l.errors.cabinetError, { show_alert: true });
        }
        return;
      }

      // Convert userId to string for database calls
      const orders = await this.databaseService.getOrders(userId.toString());
      const orderCount = await this.databaseService.getOrderCount(userId.toString());
      const balanceUSDT = await this.databaseService.getBalance(userId.toString(), 'USDT');
      const balanceRUB = await this.databaseService.getBalance(userId.toString(), 'RUB');

      let userPhoto;
      try {
        // Pass userId (number) directly to getUserProfilePhotos
        const photos = await ctx.telegram.getUserProfilePhotos(userId, 0, 1);
        if (photos && photos.photos.length > 0) {
          userPhoto = photos.photos[0][0];
        }
      } catch (error) {
        this.logger.warn('Could not get user profile photo:', error);
      }

      const message =
        `${l.cabinet.title}\n` +
        `${l.cabinet.user} ${ctx.from.username ? '@' + ctx.from.username : 'Не указан'}\n` +
        `${l.cabinet.id} ${userId}\n` +
        `${l.cabinet.orders} ${orderCount}\n` +
        `${l.cabinet.partner}\n` +
        `${l.cabinet.percent} ${user.refPercent}%\n` +
        `${l.cabinet.referrals} ${user.referrals?.length || 0}\n` +
        `${l.cabinet.balance} ${balanceUSDT} $\n` + // Assuming USDT balance is in $
        `${l.cabinet.link}\n`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: l.cabinet.ordersButton, callback_data: 'orders' },
            { text: l.cabinet.refreshButton, callback_data: 'refresh_cabinet' },
            { text: l.cabinet.backButton, callback_data: 'back_to_menu' },
          ],
        ],
      };

      const messageIdToEdit = this.getMessageIdToEdit(ctx);
      const chatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat.id;

      if (!chatId || !messageIdToEdit) {
          this.logger.error(`Cannot edit message in handleCabinet for user ${userId}: chatId or messageId missing.`);
          if ('callback_query' in ctx) {
            await ctx.answerCbQuery('Ошибка обновления кабинета.', { show_alert: true });
          }
          return;
      }

      if (userPhoto) {
        // Use editMessageMedia on telegram object to ensure it works with messageId
        await ctx.telegram.editMessageMedia(
          chatId,
          messageIdToEdit,
          undefined,
          {
            type: 'photo',
            media: userPhoto.file_id,
            caption: message,
            parse_mode: 'HTML' as const,
          },
          { reply_markup: keyboard },
        );
      } else {
        // Use editMessageCaption on telegram object
        await ctx.telegram.editMessageCaption(chatId, messageIdToEdit, undefined, message, {
          parse_mode: 'HTML' as const,
          reply_markup: keyboard,
        });
      }
        // Answer callback query after successful edit
        if ('callback_query' in ctx) {
            await ctx.answerCbQuery();
        }

    } catch (error) {
      this.logger.error('Error in handleCabinet:', error);
      if ('callback_query' in ctx) {
        await ctx.answerCbQuery('Произошла ошибка. Пожалуйста, попробуйте позже.', { show_alert: true });
      }
    }
  }

  async handleBackToMenu(ctx: Context) {
    if (!ctx.callbackQuery?.message || !ctx.from) {
        return;
    }
    const userId = ctx.from.id;

    try {
      const user = await this.databaseService.getUserById(userId.toString());
      this.logger.log(`Entering handleBackToMenu for user ${userId}. Language from DB: ${user?.language}`);

      if (!user || !user.language) {
        this.logger.error(`User or user language not found in handleBackToMenu for user ${userId}. Defaulting to 'ru'.`);
        await this.showLanguageSelection(ctx); 
        return;
      }
      const language = user.language;
      const l = this.getLocalization(language);

      if (!(userId in this.bannerIndex)) {
        this.bannerIndex[userId] = 0;
      }
      if (!BANNERS[language] || BANNERS[language].length === 0) {
          this.logger.error(`No banners found for language ${language} in handleBackToMenu. Cannot proceed.`);
          await ctx.answerCbQuery(l.errors.general || 'Error loading menu. Please try /start.', { show_alert: true });
          return;
      }
      if (this.bannerIndex[userId] >= BANNERS[language].length) {
        this.bannerIndex[userId] = 0; 
      }

      let currentBanner = BANNERS[language][this.bannerIndex[userId] || 0];
      if (!currentBanner || !currentBanner.animation || !currentBanner.game) {
          this.logger.error(`Invalid banner data for language ${language}, index ${this.bannerIndex[userId]} in handleBackToMenu.`);
          if (BANNERS[language].length > 0 && BANNERS[language][0]?.animation && BANNERS[language][0]?.game) {
              this.logger.warn(`Falling back to the first banner for language ${language}.`);
              currentBanner = BANNERS[language][0];
              this.bannerIndex[userId] = 0;
          } else {
              this.logger.error(`No valid banners available for language ${language} to fallback to. Cannot proceed with menu display.`);
              await ctx.answerCbQuery(l.errors.general || 'Error loading menu content. Please try /start.', { show_alert: true });
              return;
          }
      }
      
      const buttonTexts = language === 'ru'
      ? {
          catalog: '📂 Каталог', news: '📱 Новости', cabinet: '💼 Кабинет',
          about: '❗ О нас', support: '👨‍💼 Поддержка', reviews: '✅ Отзывы',
          share: '🚀 Поделиться', languageSwitch: '🇬🇧 English',
          prev: '⏮', next: '⏭', playStop: this.isPlaying[userId] ? '⏹' : '▶️',
          backToMenu: l.cabinet.backButton || '🔙 Назад в меню' 
        }
      : {
          catalog: '📂 Catalog', news: '📱 News', cabinet: '💼 Cabinet',
          about: '❗ About', support: '👨‍💼 Support', reviews: '✅ Reviews',
          share: '🚀 Share', languageSwitch: '🇷🇺 Русский',
          prev: '⏮', next: '⏭', playStop: this.isPlaying[userId] ? '⏹' : '▶️',
          backToMenu: l.cabinet.backButton || '🔙 Back to menu'
        };

      const keyboard = {
        inline_keyboard: [
          [
            { text: buttonTexts.prev, callback_data: 'banner_prev' },
            { text: buttonTexts.playStop, callback_data: this.isPlaying[userId] ? 'banner_stop' : 'banner_play' },
            { text: buttonTexts.next, callback_data: 'banner_next' },
          ],
          [
            { text: buttonTexts.catalog, callback_data: 'catalog' },
            { text: buttonTexts.news, callback_data: 'news' },
          ],
          [
            { text: buttonTexts.cabinet, callback_data: 'cabinet' },
            { text: buttonTexts.about, callback_data: 'about' },
          ],
          [
            { text: buttonTexts.support, callback_data: 'support' },
            { text: buttonTexts.reviews, callback_data: 'reviews' },
          ],
          [
            { text: buttonTexts.languageSwitch, callback_data: language === 'ru' ? 'lang_en' : 'lang_ru' },
            { text: buttonTexts.share, callback_data: 'share' },
          ],
        ],
      };

      await ctx.editMessageMedia(
        {
          type: 'animation',
          media: currentBanner.animation,
          caption: currentBanner.game,
          parse_mode: 'HTML' as const,
        },
        { reply_markup: keyboard },
      );

      if (ctx.callbackQuery.message.message_id) {
        this.userMessageIds[userId] = ctx.callbackQuery.message.message_id;
      }

      await ctx.answerCbQuery(buttonTexts.backToMenu);
    } catch (error) {
      this.logger.error('Error in handleBackToMenu:', error);
      let langForError = 'ru';
      if (ctx.from) {
          const userFromDb = await this.databaseService.getUserById(ctx.from.id.toString());
          if (userFromDb && userFromDb.language) {
              langForError = userFromDb.language;
          }
      }
      const errorL10n = this.getLocalization(langForError);
      if ('callback_query' in ctx) {
        await ctx.answerCbQuery(errorL10n.errors.general || '❌ Ошибка при возврате в меню');
      }
    }
  }

  async handleRefreshCabinet(ctx: Context) {
    if (!ctx.from) { 
        return;
    }
     const userId = ctx.from.id;

    try {
      await this.handleCabinet(ctx);
      if ('callback_query' in ctx) {
        await ctx.answerCbQuery('✅ Информация обновлена', { show_alert: false });
      }
    } catch (error) {
      this.logger.error('Error in handleRefreshCabinet:', error);
      if ('callback_query' in ctx) {
        await ctx.answerCbQuery('Произошла ошибка. Пожалуйста, попробуйте позже.');
      }
    }
  }

  private async storeMessageId(ctx: Context, message: any) {
    if (ctx.from && 'message_id' in message) {
        this.userMessageIds[ctx.from.id.toString()] = message.message_id;
    }
  }

  private getMessageIdToEdit(ctx: Context): number | undefined {
    return ctx.from ? this.userMessageIds[ctx.from.id.toString()] : undefined;
  }

  private getMainMenuKeyboard(language: string, userId: string) {
     const buttonTexts = language === 'ru'
        ? {
            catalog: '📂 Каталог', news: '📱 Новости', cabinet: '💼 Кабинет',
            about: '❗ О нас', support: '👨‍💼 Поддержка', reviews: '✅ Отзывы',
            share: '🚀 Поделиться', language: '🇬🇧 English',
            prev: '⏮', next: '⏭', 
            playStop: this.isPlaying[userId] ? '⏹' : '▶️',
          }
        : {
            catalog: '📂 Catalog', news: '📱 News', cabinet: '💼 Cabinet',
            about: '❗ About', support: '👨‍💼 Support', reviews: '✅ Reviews',
            share: '🚀 Share', language: '🇷🇺 Русский',
            prev: '⏮', next: '⏭', 
            playStop: this.isPlaying[userId] ? '⏹' : '▶️',
          };
          
      return {
        inline_keyboard: [
          [
            { text: buttonTexts.prev, callback_data: 'banner_prev' },
            { text: buttonTexts.playStop, callback_data: this.isPlaying[userId] ? 'banner_stop' : 'banner_play' },
            { text: buttonTexts.next, callback_data: 'banner_next' },
          ],
          [
            { text: buttonTexts.catalog, callback_data: 'catalog' },
            { text: buttonTexts.news, callback_data: 'news' },
          ],
          [
            { text: buttonTexts.cabinet, callback_data: 'cabinet' },
            { text: buttonTexts.about, callback_data: 'about' },
          ],
          [
            { text: buttonTexts.support, callback_data: 'support' },
            { text: buttonTexts.reviews, callback_data: 'reviews' },
          ],
          [
            { text: buttonTexts.language, callback_data: language === 'ru' ? 'lang_en' : 'lang_ru' },
            { text: buttonTexts.share, callback_data: 'share' },
          ],
        ],
      };
  }
}