interface Category {
  name: string;
  emoji: string;
}

interface Banner {
  id: string;
  game: string;
  animation: string;
}

export const WELCOME_GIFS = {
  ru: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXlldzJobGtqNTE2NW9mbnpmdGo0ejJxM3hlOG5tZ3N2MnBycXA4NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LDjKkXTfIPZ7zYOcvq/giphy.gif',
  en: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWdqbGlqNnV3cG9nejc4anNudm5ycXE3bmhkMWhjZnlxejlsejExNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Br5i1DgRrNT9uCvssd/giphy.gif'
};

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

export const GAME_CATEGORIES: Record<string, Record<string, Category>> = {
  ru: {
    action: { emoji: '🎮', name: 'Экшен' },
    rpg: { emoji: '⚔️', name: 'РПГ' },
    strategy: { emoji: '🎯', name: 'Стратегии' },
    sports: { emoji: '⚽', name: 'Спорт' },
    racing: { emoji: '🏎️', name: 'Гонки' }
  },
  en: {
    action: { emoji: '🎮', name: 'Action' },
    rpg: { emoji: '⚔️', name: 'RPG' },
    strategy: { emoji: '🎯', name: 'Strategy' },
    sports: { emoji: '⚽', name: 'Sports' },
    racing: { emoji: '🏎️', name: 'Racing' }
  }
};

export const SUPPORT_URL = 'https://t.me/tiptop_support';