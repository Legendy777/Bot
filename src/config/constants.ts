// Константы для Telegram бота

export const WELCOME_GIFS = {
  ru: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHppdWQzb3MxbzNndjhlZTFiMHpwYnI3Z2l0dGp4czc4dGppZGJiYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/NjCzN2GiZFlLjgHJO4/giphy.gif',
  en: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHppdWQzb3MxbzNndjhlZTFiMHpwYnI3Z2l0dGp4czc4dGppZGJiYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/NjCzN2GiZFlLjgHJO4/giphy.gif'
};

export const SUBSCRIBE_REQUEST_GIF = 'https://img1.picmix.com/output/stamp/normal/5/0/2/9/29205_6aa48.gif';

// Интерфейсы для баннеров
interface Banner {
  id: string;
  game: string;
  animation: string;
}

// Баннеры для разных языков
export const BANNERS: Record<string, Banner[]> = {
  ru: [
    {
      id: 'FC-001',
      animation: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXlldzJobGtqNTE2NW9mbnpmdGo0ejJxM3hlOG5tZ3N2MnBycXA4NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LDjKkXTfIPZ7zYOcvq/giphy.gif',
      game: 'EA Sports FC Mobile 📲'
    },
    {
      id: 'ASP-002',
      animation: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWdqbGlqNnV3cG9nejc4anNudm5ycXE3bmhkMWhjZnlxejlsejExNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Br5i1DgRrNT9uCvssd/giphy.gif',
      game: 'Asphalt Legends Unite 🆔'
    }
  ],
  en: [
    {
      id: 'FC-001',
      animation: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXlldzJobGtqNTE2NW9mbnpmdGo0ejJxM3hlOG5tZ3N2MnBycXA4NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LDjKkXTfIPZ7zYOcvq/giphy.gif',
      game: 'EA Sports FC Mobile 📲'
    },
    {
      id: 'ASP-002',
      animation: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWdqbGlqNnV3cG9nejc4anNudm5ycXE3bmhkMWhjZnlxejlsejExNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Br5i1DgRrNT9uCvssd/giphy.gif',
      game: 'Asphalt Legends Unite 🆔'
    }
  ]
};

// Категории игр
export const GAME_CATEGORIES = {
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

export const SUPPORT_URL = 'https://t.me/tiptop_support';
