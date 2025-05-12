# TipTop Telegram Bot

Telegram бот на NestJS для платформы TipTop.

## Технологии

- NestJS
- MongoDB
- Telegraf
- TypeScript

## Установка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
```

2. Установите зависимости:
```bash
npm install
```

3. Скопируйте `.env.example` в `.env` и заполните необходимые переменные окружения:
```bash
cp .env.example .env
```

4. Запустите проект:

Разработка:
```bash
npm run dev
```

Продакшн:
```bash
npm run build
npm run start:prod
```

## Структура проекта

```
src/
├── bot/           # Модуль бота
├── database/      # Модуль базы данных
├── main.ts        # Точка входа
└── app.module.ts  # Корневой модуль
```

## Функционал

- Обработка платежей через CryptoPay
- Система уведомлений
- Управление заказами
- Система отзывов
- Вывод средств

## Разработка

1. Создайте новую ветку для фичи:
```bash
git checkout -b feature/your-feature-name
```

2. Внесите изменения и отправьте их:
```bash
git add .
git commit -m "feat: добавлен новый функционал"
git push origin feature/your-feature-name
```

## Логирование

Логи сохраняются в директории `logs/`. Уровень логирования настраивается через переменную окружения `LOG_LEVEL`.

## Безопасность

- Все токены и пароли должны храниться в `.env` файле
- `.env` файл не должен попадать в репозиторий
- Используйте безопасные значения для `JWT_SECRET`

## Лицензия

MIT 