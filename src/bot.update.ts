import { Update, Ctx, Start, On, Action, Hears, InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { BotService } from './bot.service';

@Update()
export class BotUpdate {
  constructor(
    private readonly botService: BotService,
    @InjectBot() private readonly bot: Telegraf<Context>,
  ) {}

  @Start()
  async startCommand(@Ctx() ctx: Context) {
    return this.botService.handleStart(ctx);
  }

  @On('inline_query')
  async onInlineQuery(@Ctx() ctx: Context) {
    return this.botService.handleInlineQuery(ctx);
  }

  @Action('cabinet')
  async cabinetAction(@Ctx() ctx: Context) {
    return this.botService.handleCabinet(ctx);
  }

  @Action('banner_prev')
  async bannerPrevAction(@Ctx() ctx: Context) {
    return this.botService.handleBannerControl(ctx, 'prev');
  }

  @Action('banner_next')
  async bannerNextAction(@Ctx() ctx: Context) {
    return this.botService.handleBannerControl(ctx, 'next');
  }

  @Action('banner_play')
  async bannerPlayAction(@Ctx() ctx: Context) {
    return this.botService.handleBannerControl(ctx, 'play');
  }

  @Action('banner_stop')
  async bannerStopAction(@Ctx() ctx: Context) {
    return this.botService.handleBannerControl(ctx, 'stop');
  }

  @Action('check_subscription')
  async checkSubscriptionAction(@Ctx() ctx: Context) {
    return this.botService.handleCheckSubscription(ctx);
  }

  @Action('lang_ru')
  async langRuAction(@Ctx() ctx: Context) {
    return this.botService.handleLanguageChange(ctx, 'ru');
  }

  @Action('lang_en')
  async langEnAction(@Ctx() ctx: Context) {
    return this.botService.handleLanguageChange(ctx, 'en');
  }


  @Action('back_to_menu')
  async backToMenuAction(@Ctx() ctx: Context) {
    return this.botService.handleBackToMenu(ctx);
  }

  @Action('refresh_cabinet')
  async refreshCabinetAction(@Ctx() ctx: Context) {
    return this.botService.handleRefreshCabinet(ctx);
  }

  @Action('orders')
  async ordersAction(@Ctx() ctx: Context) {
    return this.botService.handleOrders(ctx);
  }

  @Action('deposit_usdt')
  async depositUsdtAction(@Ctx() ctx: Context) {
    return this.botService.handleBalance(ctx);
  }

  @Action('withdraw')
  async withdrawAction(@Ctx() ctx: Context) {
    return this.botService.handleBalance(ctx);
  }

  @Hears('🏠')
  async homeAction(@Ctx() ctx: Context) {
    return this.botService.showMainMenu(ctx, false);
  }

  @Hears('📱 Меню')
  async menuAction(@Ctx() ctx: Context) {
    if (!ctx.from || !ctx.chat) return;
    const userId = ctx.from.id.toString();
    
    try {
      // Удаляем сообщение пользователя для очистки интерфейса
      await ctx.deleteMessage().catch(err => {
        console.warn(`Could not delete user message for ${userId}:`, err);
      });
      
      // Показываем главное меню, как при команде start
      return this.botService.showMainMenu(ctx, false);
    } catch (error) {
      console.error(`Error in menuAction for user ${userId}:`, error);
      await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.");
    }
  }

  @Hears('💬')
  async supportAction(@Ctx() ctx: Context) {
    if (!ctx.from || !ctx.chat) return;
    const userId = ctx.from.id.toString();
    
    try {
      // Удаляем сообщение пользователя
      await ctx.deleteMessage().catch(err => {
        console.warn(`Could not delete user message for ${userId}:`, err);
      });
      
      await ctx.reply("Для связи с поддержкой перейдите по ссылке:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: '👨‍💻 Поддержка', url: 'https://chat.integracio.ru/79950450f448d39e3465de1d7a2e24bc/mobile-games.online/ru' }]
          ]
        }
      });
    } catch (error) {
      console.error(`Error in supportAction for user ${userId}:`, error);
      await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.");
    }
  }

  @Action('support')
  async supportActionCallback(@Ctx() ctx: Context) {
    const userId = ctx.from?.id.toString();
    if (!userId) {
      await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.");
      return;
    }

    try {
      await ctx.answerCbQuery();
      
      await ctx.reply("Для связи с поддержкой перейдите по ссылке:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: '👨‍💻 Поддержка', url: 'https://chat.integracio.ru/79950450f448d39e3465de1d7a2e24bc/mobile-games.online/ru' }]
          ]
        }
      });
    } catch (error) {
      console.error(`Error in supportAction for user ${userId}:`, error);
      await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.");
    }
  }

  @Hears('🏠 Меню')
  async menuButtonHandler(@Ctx() ctx: Context) {
    return this.botService.showMainMenu(ctx);
  }

  @Hears('🏠 Menu')
  async menuButtonHandlerEn(@Ctx() ctx: Context) {
    return this.botService.showMainMenu(ctx);
  }

  @Hears('👨‍💻 Поддержка')
  async supportButtonHandler(@Ctx() ctx: Context) {
    await ctx.reply("Для связи с поддержкой перейдите по ссылке:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👨‍💻 Поддержка', url: 'https://chat.integracio.ru/79950450f448d39e3465de1d7a2e24bc/mobile-games.online/ru' }]
        ]
      }
    });
  }

  @Hears('👨‍💻 Support')
  async supportButtonHandlerEn(@Ctx() ctx: Context) {
    await ctx.reply("For support contact, please follow the link:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👨‍💻 Support', url: 'https://chat.integracio.ru/79950450f448d39e3465de1d7a2e24bc/mobile-games.online/ru' }]
        ]
      }
    });
  }
}
