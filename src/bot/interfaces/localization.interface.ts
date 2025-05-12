export interface Localization {
  welcome: string;
  menu: {
    main: string;
    settings: string;
    profile: string;
    help: string;
  };
  errors: {
    general: string;
    notFound: string;
    unauthorized: string;
    shareError: string;
    cabinetError: string;
  };
  orders: {
    empty: string;
    title: string;
  };
  share: {
    title: string;
    description: string;
    message: string;
    button: string;
  };
  cabinet: {
    title: string;
    user: string;
    id: string;
    orders: string;
    partner: string;
    percent: string;
    referrals: string;
    balance: string;
    link: string;
    ordersButton: string;
    refreshButton: string;
    backButton: string;
    cabinetUser?: string;
    cabinetId?: string;
    cabinetOrders?: string;
    cabinetPartner?: string;
    cabinetPercent?: string;
    cabinetReferrals?: string;
    cabinetBalance?: string;
    cabinetLink?: string;
  };
  buttons: {
    play: string;
    back: string;
    switchPm: string;
    subscribeToChannel?: string;
    checkSubscription?: string;
    prev?: string;
    next?: string;
    playSlideshow?: string;
    stop?: string;
    catalog?: string;
    news?: string;
    cabinet?: string;
    about?: string;
    support?: string;
    reviews?: string;
    switchToEn?: string;
    switchToRu?: string;
    share?: string;
  };
  subscribeRequest?: string;
  subscriptionSuccess?: string;
  subscriptionFailed?: string;
  shareTitle?: string;
  selectedCategory?: string;
  playButton?: string;
  switchPmText?: string;
  shareDescription?: string;
  shareMessage?: string;
  shareButton?: string;
  backButton?: string;
  profile?: string;
  categories?: {
    selected: string;
  };
}

export const localizations: Record<string, Localization> = {
  ru: {
    welcome: 'Добро пожаловать!',
    menu: {
      main: 'Главное меню',
      settings: 'Настройки',
      profile: 'Профиль',
      help: 'Помощь',
    },
    errors: {
      general: 'Произошла ошибка. Пожалуйста, попробуйте позже.',
      notFound: 'Не найдено.',
      unauthorized: 'Не авторизован.',
      shareError: 'Ошибка при попытке поделиться.',
      cabinetError: 'Ошибка при загрузке кабинета.',
    },
    orders: {
      empty: 'У вас пока нет заказов',
      title: 'Мои заказы',
    },
    share: {
      title: 'Поделиться игрой',
      description: 'Присоединяйся к игре и получи бонус!',
      message: '📲 Поделитесь ботом с друзьями!',
      button: '🚀 Поделиться',
    },
    cabinet: {
      title: 'Личный кабинет',
      user: 'Пользователь:',
      id: 'ID:',
      orders: 'Заказы:',
      partner: 'Партнерская программа:',
      percent: 'Процент:',
      referrals: 'Рефералы:',
      balance: 'Баланс:',
      link: 'Ваша реферальная ссылка:',
      ordersButton: '📦 Мои Заказы',
      refreshButton: '🔄 Обновить',
      backButton: '⬅️ Назад в меню',
      cabinetUser: 'Пользователь:',
      cabinetId: 'ID:',
      cabinetOrders: 'Количество заказов:',
      cabinetPartner: 'Партнерская программа:',
      cabinetPercent: 'Ваш процент:',
      cabinetReferrals: 'Приглашено:',
      cabinetBalance: 'Баланс USDT:',
      cabinetLink: 'Ссылка для друзей:',
    },
    buttons: {
      play: 'Играть',
      back: 'Назад',
      switchPm: 'Перейти к боту 🤖',
      subscribeToChannel: '📢 Подписаться на канал',
      checkSubscription: '✅ Проверить подписку',
      prev: '⏮',
      next: '⏭',
      playSlideshow: '▶️ Слайдшоу',
      stop: '⏹ Стоп',
      catalog: '📂 Каталог',
      news: '📱 Новости',
      cabinet: '💼 Кабинет',
      about: '❗ О нас',
      support: '👨‍💼 Поддержка',
      reviews: '✅ Отзывы',
      switchToEn: '🇬🇧 English',
      switchToRu: '🇷🇺 Русский',
      share: '🚀 Поделиться',
    },
    subscribeRequest: '📢 Для использования бота необходимо подписаться на наш канал!',
    subscriptionSuccess: '✅ Отлично! Теперь вам доступен весь функционал бота',
    subscriptionFailed: '❌ Вы все еще не подписаны. Пожалуйста, подпишитесь и попробуйте снова.',
    shareTitle: '🎮 Поделиться игрой',
    selectedCategory: 'Выбрана категория:',
    playButton: 'Играть здесь',
    switchPmText: 'Написать боту',
    shareDescription: 'Присоединяйся и получай бонусы!',
    shareMessage: 'Отправь это сообщение другу:',
    shareButton: 'Поделиться сейчас',
    backButton: 'В меню',
    profile: 'Мой профиль',
    categories: {
      selected: 'Выбрана категория:',
    },
  },
  en: {
    welcome: 'Welcome!',
    menu: { main: 'Main Menu', settings: 'Settings', profile: 'Profile', help: 'Help' },
    errors: { general: 'An error occurred. Please try again later.', notFound: 'Not found.', unauthorized: 'Unauthorized.', shareError: 'Error sharing.', cabinetError: 'Error loading cabinet.' },
    orders: { empty: 'You have no orders yet.', title: 'My Orders' },
    share: { title: 'Share Game', description: 'Join the game and get a bonus!', message: '📲 Share the bot with friends!', button: '🚀 Share' },
    cabinet: {
      title: 'Personal Cabinet',
      user: 'User:',
      id: 'ID:',
      orders: 'Orders:',
      partner: 'Affiliate Program:',
      percent: 'Percent:',
      referrals: 'Referrals:',
      balance: 'Balance:',
      link: 'Your referral link:',
      ordersButton: '📦 My Orders',
      refreshButton: '🔄 Refresh',
      backButton: '⬅️ Back to Menu',
      cabinetUser: 'User:',
      cabinetId: 'ID:',
      cabinetOrders: 'Order count:',
      cabinetPartner: 'Affiliate Program:',
      cabinetPercent: 'Your percentage:',
      cabinetReferrals: 'Invited:',
      cabinetBalance: 'USDT Balance:',
      cabinetLink: 'Link for friends:',
    },
    buttons: {
      play: 'Play',
      back: 'Back',
      switchPm: 'Switch to PM 🤖',
      subscribeToChannel: '📢 Subscribe to Channel',
      checkSubscription: '✅ Check Subscription',
      prev: '⏮',
      next: '⏭',
      playSlideshow: '▶️ Slideshow',
      stop: '⏹ Stop',
      catalog: '📂 Catalog',
      news: '📱 News',
      cabinet: '💼 Cabinet',
      about: '❗ About Us',
      support: '👨‍💼 Support',
      reviews: '✅ Reviews',
      switchToEn: '🇬🇧 English',
      switchToRu: '🇷🇺 Russian',
      share: '🚀 Share',
    },
    subscribeRequest: '📢 To use the bot, you need to subscribe to our channel!',
    subscriptionSuccess: '✅ Great! Full functionality is now available to you.',
    subscriptionFailed: '❌ You are still not subscribed. Please subscribe and try again.',
    shareTitle: '🎮 Share Game',
    selectedCategory: 'Selected category:',
    playButton: 'Play Here',
    switchPmText: 'Message the bot',
    shareDescription: 'Join and get bonuses!',
    shareMessage: 'Send this message to a friend:',
    shareButton: 'Share Now',
    backButton: 'To Menu',
    profile: 'My Profile',
    categories: {
      selected: 'Selected category:',
    },
  },
}; 