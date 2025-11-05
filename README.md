# Load schedule serverless cloud function

Node.js проект для выгрузки расписания [университета](https://study.miigaik.ru/) через его api в Google Calendar через API.
Выгружается расписание на 1 неделю.
Проект развертывается в **Yandex Cloud Function**, так же настроен cron trigger который будет запускать скрипт каждую неделю.

---

## Структура проекта

```bash
.
├── .env
├── .gitignore
├── package-lock.json
├── package.json
└── src
    ├── env.js          # Валидирует и загружает переменные окружения
    ├── handler.js      # Основной обработчик функции entrypoint для yandex serverless function 
    └── index.js        # Для локального запуска через npm start
```

---

## Установка

```bash
git clone https://github.com/FoxyGDFD/load-schedule-cloud-function.git
cd load-schedule-cloud-function
npm install
```

Создай `.env` файл для локальной разработки:

```
CALENDAR_ID=primary
SCHEDULE_API_URL=https://study.miigaik.ru/api/v1/group/1512

GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
GOOGLE_CLIENT_ID=<your_client_id>
GOOGLE_CLIENT_SECRET=<your_client_secret>
GOOGLE_REFRESH_TOKEN=<your_refresh_token>
```

> В Yandex Cloud секреты хранятся через Environment Variables, `.env` нужен только для локальной работы.

---

## Локальный запуск

```bash
npm start
```

Запускает `src/index.js`, который вызывает обработчик функции.

---

## Деплой в Yandex Cloud Functions

1. В GitHub Actions или локально используйте команду деплоя через [yc cli](https://yandex.cloud/ru/docs/cli/operations/install-cli), указывая environment variables, они точно такие же как в `.env` файле.


> В Cloud Function `handler` указывается как `src/handler.handler`.

1. После деплоя функция готова к вызовам и может быть подключена к триггеру (cron).

---

## Cron-триггер

Для запуска каждое воскресенье в 10:00 используйте cron-выражение в Yandex Cloud:

```
0 10 ? * SUN 
```

---

## Environment Variables (обязательно для работы функции)

* `GOOGLE_CLIENT_ID`
* `GOOGLE_CLIENT_SECRET`
* `GOOGLE_REFRESH_TOKEN`
* `SCHEDULE_API_URL`

---

## Dependencies

* `axios`
* `dayjs`
* `dotenv`
* `googleapis`
* `valibot`

---

## License

MIT