1. 📌 Уточнение команды запуска в dev:
diff
Копировать код
- npm run dev
+ npm run start:dev
npm run dev — по умолчанию не определён. Если ты не переопределял его в package.json, лучше явно start:dev.

2. 📎 Ссылка в git clone
diff
Копировать код
git clone <repository-url>
Замени на:

bash
Копировать код
git clone https://github.com/Legendy777/Bot.git
✅ Готовый итоговый README.md (со всеми правками)
markdown
Копировать код
# 🚀 TipTop Telegram Bot

Telegram-бот на NestJS для платформы TipTop.

## 🧰 Технологии

- NestJS
- MongoDB
- Telegraf
- TypeScript

## 🔧 Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/Legendy777/Bot.git
Установите зависимости:

bash
Копировать код
npm install
Скопируйте .env.example в .env и заполните необходимые переменные:

bash
Копировать код
cp .env.example .env
Запустите проект:

Разработка:

bash
Копировать код
npm run start:dev
Продакшн:

bash
Копировать код
npm run build
npm run start:prod
🗂️ Структура проекта
ruby
Копировать код
src/
├── bot/           # Модуль бота
├── database/      # Модуль базы данных
├── main.ts        # Точка входа
└── app.module.ts  # Корневой модуль
💡 Функционал
Обработка платежей через CryptoPay

Система уведомлений

Управление заказами

Система отзывов

Вывод средств

👨‍💻 Разработка
bash
Копировать код
git checkout -b feature/название-фичи
git add .
git commit -m "feat: описание"
git push origin feature/название-фичи
📜 Логирование
Логи сохраняются в logs/

Уровень настраивается через LOG_LEVEL в .env

🔐 Безопасность
Все токены и пароли должны храниться в .env

.env внесён в .gitignore (не пушится в репу)

Используйте надёжные значения JWT_SECRET

📝 Лицензия