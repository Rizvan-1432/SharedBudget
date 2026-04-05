# SharedBudget

Учёт общих трат и долгов: пространства (квартира, поездка, проект), приглашения по ссылке, траты с делением поровну или по долям, балансы и минимальный набор переводов для взаиморасчёта.

Подробная спецификация MVP: [docs/SHARED_BUDGET_PROMPT.md](docs/SHARED_BUDGET_PROMPT.md).

## Стек

| Слой | Технологии |
|------|------------|
| Frontend | React (Vite), TypeScript, TanStack Query, React Router, React Hook Form, Zod |
| Backend | NestJS, TypeScript, Prisma |
| БД | PostgreSQL |

Монорепо на **npm workspaces**: `apps/api`, `apps/web`.

## Требования

- **Node.js** 20+ и **npm**
- **PostgreSQL** — через **Docker** (`docker compose`) или **Homebrew** (`postgresql@16` и выше)

## Быстрый старт

### 1. Зависимости

```bash
npm install
```

### 2. Переменные окружения

**API** — скопируйте пример и при необходимости поправьте:

```bash
cp apps/api/.env.example apps/api/.env
```

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | Строка подключения PostgreSQL (в примере для Mac: `127.0.0.1` и `sslmode=disable`, чтобы избежать ошибки Prisma **P1010**) |
| `JWT_ACCESS_SECRET` | Секрет подписи access JWT (**обязательно сменить в проде**) |
| `JWT_ACCESS_EXPIRES_SEC` | Время жизни access-токена в секундах (по умолчанию `900`) |
| `JWT_REFRESH_EXPIRES_DAYS` | Срок refresh-токена в днях (по умолчанию `7`) |
| `PORT` | Порт API (по умолчанию `3000`) |

**Web** — для локальной разработки уже есть `apps/web/.env.development` с `VITE_API_URL=http://localhost:3000`. При другом хосте API скопируйте `apps/web/.env.example` в `apps/web/.env.local` и укажите свой `VITE_API_URL`.

### 3. База данных

```bash
docker compose up -d
npm run db:deploy
```

`db:deploy` выполняет `prisma migrate deploy` в `apps/api` (применяет миграции к БД из `DATABASE_URL`).

**Без Docker (Homebrew):** поднимите сервис `brew services start postgresql@16`, создайте роль и базу (один раз):

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
psql -d postgres -c "DO \$\$ BEGIN CREATE ROLE sharedbudget WITH LOGIN PASSWORD 'sharedbudget'; EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;"
psql -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'sharedbudget'" | grep -q 1 || psql -d postgres -c "CREATE DATABASE sharedbudget OWNER sharedbudget;"
npm run db:deploy
```

Убедитесь, что в `apps/api/.env` строка `DATABASE_URL` совпадает с `apps/api/.env.example` (хост **`127.0.0.1`**, не `localhost`, и параметр **`sslmode=disable`**).

### 4. Запуск

В двух терминалах:

```bash
npm run api:dev
```

```bash
npm run web:dev
```

- API: [http://localhost:3000](http://localhost:3000)
- Веб: [http://localhost:5173](http://localhost:5173)

Остановка контейнера БД: `npm run db:down`.

## Скрипты в корне

| Скрипт | Действие |
|--------|----------|
| `npm run api:dev` | NestJS в режиме watch |
| `npm run web:dev` | Vite dev server |
| `npm run db:up` / `db:down` | Поднять/остановить PostgreSQL в Docker |
| `npm run db:migrate` | `prisma migrate dev` (разработка новых миграций) |
| `npm run db:deploy` | `prisma migrate deploy` (CI/прод/чистое применение) |

В пакете `apps/api` дополнительно: `npm run prisma:generate`, `npm run build`, `npm test`.

## Сборка для продакшена

```bash
npm run build -w api
npm run build -w web
```

Артефакты: `apps/api/dist`, `apps/web/dist`. Для API на сервере задайте переменные окружения и выполните миграции (`prisma migrate deploy`). Статику из `apps/web/dist` раздавайте через CDN или вложите в nginx; `VITE_*` подставляются **на этапе сборки** фронта.

## Деплой (ориентир)

- **БД + API:** [Railway](https://railway.app/) или [Render](https://render.com/) — подключить PostgreSQL, задать `DATABASE_URL` и секреты JWT, команду старта вида `node dist/main.js` из каталога API после сборки.
- **Frontend:** [Vercel](https://vercel.com/) или [Netlify](https://www.netlify.com/) — сборка из `apps/web`, переменная `VITE_API_URL` = публичный URL API.

## Структура репозитория

```
apps/api/          # NestJS + Prisma
apps/web/          # Vite + React
docs/              # Спецификация и промпты
docker-compose.yml # Локальный PostgreSQL
```

## Лицензия

Приватный проект (при необходимости укажите лицензию в репозитории).
