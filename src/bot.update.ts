import { Update, Start, Ctx, Action, InjectBot, On } from 'nestjs-telegraf';
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

  @Action('share')
  async shareAction(@Ctx() ctx: Context) {
    return this.botService.handleShare(ctx);
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
}