# ПроПлюшка MVP

Мультикомпанейное PWA/SaaS-приложение для QR-программ лояльности малых бизнесов.

## Архитектура

- Next.js App Router: страницы, серверные действия и API routes.
- React + TypeScript + Tailwind CSS: интерфейс витрины, суперадминки, кабинета компании и клиента.
- Prisma + SQLite: локальная база MVP с возможностью перейти на PostgreSQL через `DATABASE_URL`.
- JWT-cookie: единая сессия, роли проверяются на сервере.
- PWA: `manifest.json`, `sw.js`, кнопка установки на клиентском экране.
- QR: QR содержит `tega:<qrToken>`, без телефона клиента.

## Структура

```txt
src/app
  page.tsx                         публичная главная
  offer/page.tsx                   договор-оферта
  privacy/page.tsx                 политика персональных данных
  c/[companySlug]                  публичная страница компании
  c/[companySlug]/app              личный кабинет клиента
  company                          кабинет компании
  superadmin                       глобальная админка
  api                              API routes
src/components                     общие UI-компоненты
src/lib                            auth, db, loyalty, settings, format
prisma/schema.prisma               модели базы
prisma/seed.mjs                    тестовые данные
public/manifest.json               PWA manifest
public/sw.js                       service worker
```

## Локальный запуск

1. Создать проект, если его еще нет:

```bash
npx create-next-app@latest tega-coffee --yes --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

2. Установить зависимости:

```bash
npm install
```

3. Настроить `.env`:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-this-local-secret-before-production"
```

4. Создать базу Prisma:

```bash
npm run db:push
```

5. Заполнить seed:

```bash
npm run db:seed
```

Или одной командой сбросить локальную базу и заполнить заново:

```bash
npm run db:init
```

6. Запустить локально:

```bash
npm run dev
```

7. Открыть на ПК:

```txt
http://localhost:3000
```

8. Открыть на телефоне в одной Wi-Fi сети:

```bash
npm run dev -- -H 0.0.0.0
```

Затем откройте на телефоне:

```txt
http://IP_ВАШЕГО_ПК:3000
```

Камера телефона для QR обычно требует HTTPS. Для локального теста на странице сканера есть ручной ввод токена.

## Тестовые входы

- Глобальный админ: `79990000000` / `admin123`
- Админ компании: `79991111111` / `company123`
- Кассир: `79992222222` / `cashier123`
- Клиент: `79993333333` / `client123`

## Основные URL

- Главная: `/`
- Регистрация компании: `/company/register`
- Вход компании: `/company/login`
- Кабинет компании: `/company`
- Сканер: `/company/scan`
- Суперадмин: `/superadmin/login`
- Тестовая компания: `/c/tega`
- Клиентское PWA: `/c/tega/app`
- Оферта: `/offer`
- Политика: `/privacy`

## Юридические предупреждения

Тексты оферты и политики в seed являются предварительными шаблонами. Перед реальным запуском их должен проверить юрист. Также нужно отдельно проверить необходимость уведомления Роскомнадзора как оператора персональных данных.
