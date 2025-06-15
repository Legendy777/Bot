export interface Localization {
  buttons: {
    catalog: string;
    news: string;
    cabinet: string;
    about: string;
    support: string;
    reviews: string;
    share: string;
    language: string;
    back: string;
    menu: string;
    subscribeToChannel: string;
    checkSubscription: string;
    orders: string;
    refresh: string;
    deposit: string;
    withdraw: string;
  };
  cabinet: {
    title: string;
    user: string;
    id: string;
    orders: string;
    balance: string;
    link: string;
    percent: string;
    referrals: string;
    backButton: string;
    refreshButton: string;
  };
  orders: {
    title: string;
    empty: string;
  };
  notifications: {
    purchase: string;
    deposit: string;
    supportReply: string;
    newReferral: string;
  };
  subscribeRequest: string;
  subscriptionSuccess: string;
  subscriptionFailed: string;
  welcome: string;
  languageSelected: string;
  errors: {
    general: string;
    userBlocked: string;
  };
  slideshow: {
    alreadyPlaying: string;
    started: string;
    stoppedManual: string;
    stoppedTimer: string;
  };
}


export const localizations: Record<string, Localization> = {
  ru: {
    welcome: 'Добро пожаловать!',
    languageSelected: '🇷🇺 Русский язык выбран. Добро пожаловать!',
    subscribeRequest: '📢 Для использования бота необходимо подписаться на наш канал!',
    subscriptionSuccess: '✅ Отлично! Подписка подтверждена!',
    subscriptionFailed: '❌ Подписка не найдена. Пожалуйста, подпишитесь.',
    errors: {
      general: '❌ Произошла ошибка. Пожалуйста, попробуйте позже.',
      userBlocked: '⛔ Вы заблокированы. Доступ к боту ограничен.',
    },
    notifications: {
      purchase: '🛒 Новый заказ успешно оформлен!',
      deposit: '💰 Баланс пополнен на {amount} $!',
      supportReply: '📩 Поддержка ответила на ваш запрос!',
      newReferral: '👥 У вас новый реферал: {username}!',
    },
    buttons: {
      catalog: '📂 Каталог',
      news: '📱 Новости',
      cabinet: '💼 Кабинет',
      about: '❗ О нас',
      support: '👨‍💼 Поддержка',
      reviews: '✅ Отзывы',
      share: '🚀 Поделиться',
      language: '🇬🇧 English',
      back: '⬅️ Назад',
      menu: '📋 Меню',
      subscribeToChannel: '📢 Подписаться на канал',
      checkSubscription: '✅ Проверить подписку',
      orders: '📦 Заказы',
      refresh: '🔄 Обновить',
      deposit: '💳 Пополнить USDT',
      withdraw: '💸 Вывести средства',
    },
    cabinet: {
      title: 'Личный кабинет',
      user: 'Пользователь:',
      id: 'ID:',
      orders: 'Количество заказов:',
      percent: 'Реферальный процент:',
      referrals: 'Рефералы:',
      balance: 'Баланс:',
      link: 'Ваша реферальная ссылка:',
      refreshButton: '🔄 Обновить',
      backButton: '⬅️ Назад в меню',
    },
    orders: {
      title: '📜 Ваши заказы:\n\n',
      empty: 'У вас пока нет заказов.',
    },
    slideshow: {
      started: '▶️ Автопрокрутка запущена',
      stoppedManual: '⏹️ Автопрокрутка остановлена',
      stoppedTimer: '⏹️ Автопрокрутка остановлена по таймеру',
      alreadyPlaying: '⚠️ Слайдшоу уже запущено',
    },
  },
  en: {
    welcome: 'Welcome!',
    languageSelected: '🇬🇧 English language selected. Welcome!',
    subscribeRequest: '📢 You need to subscribe to our channel to use this bot!',
    subscriptionSuccess: '✅ Great! Subscription confirmed!',
    subscriptionFailed: '❌ Subscription not found. Please subscribe.',
    errors: {
      general: '❌ An error occurred. Please try again later.',
      userBlocked: '⛔ You are blocked. Access to the bot is restricted.',
    },
    notifications: {
      purchase: '🛒 New order successfully placed!',
      deposit: '💰 Balance topped up by {amount} $!',
      supportReply: '📩 Support has replied to your request!',
      newReferral: '👥 You have a new referral: {username}!',
    },
    buttons: {
      catalog: '📂 Catalog',
      news: '📱 News',
      cabinet: '💼 Cabinet',
      about: '❗ About Us',
      support: '👨‍💼 Support',
      reviews: '✅ Reviews',
      share: '🚀 Share',
      language: '🇷🇺 Русский',
      back: '⬅️ Back',
      menu: '📋 Menu',
      subscribeToChannel: '📢 Subscribe to Channel',
      checkSubscription: '✅ Check Subscription',
      orders: '📦 Orders',
      refresh: '🔄 Update',
      deposit: '💳 Deposit USDT',
      withdraw: '💸 Withdraw funds',
    },
    cabinet: {
      title: 'Personal Cabinet',
      user: 'User:',
      id: 'ID:',
      orders: 'Order count:',
      percent: 'Referral percent:',
      referrals: 'Referrals:',
      balance: 'Balance:',
      link: 'Your referral link:',
      refreshButton: '🔄 Update',
      backButton: '⬅️ Back to Menu',
    },
    orders: {
      title: '📜 Your Orders:\n\n',
      empty: 'You have no orders yet.',
    },
    slideshow: {
      started: '▶️ Slideshow started',
      stoppedManual: '⏹️ Slideshow stopped',
      stoppedTimer: '⏹️ Slideshow stopped by timer',
      alreadyPlaying: '⚠️ Slideshow already running',
    },
  },
};
