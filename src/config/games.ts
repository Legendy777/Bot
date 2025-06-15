// Константы игр для бота
// Данные синхронизированы с MongoDB

export interface GameData {
  id: string;
  title: string;
  emoji: string;
  image: string;
  gifUrl: string;
  hasDiscount: boolean;
  isActive: boolean;
  enabled: boolean;
  isActual: boolean;
  category: string;
  rank: number;
  tags: string[];
  appStoreUrl: string;
  googlePlayUrl: string;
  trailerUrl: string;
}

// Игры из базы данных
export const GAMES_DATA: GameData[] = [
  {
    id: "asphalt-legends",
    title: "Asphalt Legends: Unite",
    emoji: "🏎️",
    image: "https://i.ibb.co/MDP858jV/asphalt.jpg",
    gifUrl: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
    hasDiscount: true,
    isActive: true,
    enabled: true,
    isActual: true,
    category: "Racing",
    rank: 2,
    tags: ["arcade", "cars", "multiplayer"],
    appStoreUrl: "https://apps.apple.com/ua/app/asphalt-legends-unite/id805603214?l=ru",
    googlePlayUrl: "https://play.google.com/store/apps/details?id=com.gameloft.android.ANMP.GloftA9HM&hl=ru",
    trailerUrl: "https://www.youtube.com/watch?v=def456UVW"
  },
  {
    id: "fifa-mobile",
    title: "EA SPORTS FC Mobile",
    emoji: "⚽",
    image: "https://i.ibb.co/example/fifa.jpg",
    gifUrl: "https://media.giphy.com/media/l2SpMUEMRJkkqYcta/giphy.gif",
    hasDiscount: false,
    isActive: true,
    enabled: true,
    isActual: true,
    category: "Sports",
    rank: 1,
    tags: ["football", "sports", "multiplayer"],
    appStoreUrl: "https://apps.apple.com/app/fifa-mobile/id1094130054",
    googlePlayUrl: "https://play.google.com/store/apps/details?id=com.ea.gp.fifamobile",
    trailerUrl: "https://www.youtube.com/watch?v=example"
  }
];

// Категории игр с эмодзи
export const GAME_CATEGORIES_EXTENDED = {
  ru: {
    action: { emoji: '🎮', name: 'Экшен' },
    rpg: { emoji: '⚔️', name: 'РПГ' },
    strategy: { emoji: '🎯', name: 'Стратегии' },
    sports: { emoji: '⚽', name: 'Спорт' },
    racing: { emoji: '🏎️', name: 'Гонки' },
    arcade: { emoji: '🕹️', name: 'Аркады' },
    puzzle: { emoji: '🧩', name: 'Головоломки' },
    simulation: { emoji: '🏗️', name: 'Симуляторы' }
  },
  en: {
    action: { emoji: '🎮', name: 'Action' },
    rpg: { emoji: '⚔️', name: 'RPG' },
    strategy: { emoji: '🎯', name: 'Strategy' },
    sports: { emoji: '⚽', name: 'Sports' },
    racing: { emoji: '🏎️', name: 'Racing' },
    arcade: { emoji: '🕹️', name: 'Arcade' },
    puzzle: { emoji: '🧩', name: 'Puzzle' },
    simulation: { emoji: '🏗️', name: 'Simulation' }
  }
};

// Функция для получения игр по категории
export function getGamesByCategory(category: string): GameData[] {
  return GAMES_DATA.filter(game => 
    game.category.toLowerCase() === category.toLowerCase() && 
    game.enabled && 
    game.isActual
  );
}

// Функция для получения топ игр
export function getTopGames(limit: number = 5): GameData[] {
  return GAMES_DATA
    .filter(game => game.enabled && game.isActual)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);
}

// Функция для получения игр со скидкой
export function getDiscountedGames(): GameData[] {
  return GAMES_DATA.filter(game => 
    game.hasDiscount && 
    game.enabled && 
    game.isActual
  );
}

// Функция для поиска игры по ID
export function getGameById(id: string): GameData | undefined {
  return GAMES_DATA.find(game => game.id === id);
}