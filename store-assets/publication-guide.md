# Публикация «ПроПлюшка»

## Оптимальный способ

Проект остаётся Next/PWA-сервисом на `https://proplushka.ru`. Мобильное приложение собирается через Capacitor и открывает production-сайт в WebView. Такой путь не требует переписывать клиентские кабинеты, QR, авторизацию и серверные API.

Для Android готовится `.aab` для Google Play и `.apk` или `.aab` для RuStore и других Android-маркетов.

Для iOS готовится `.ipa` через Xcode. Для App Store нужно внимательно показать пользу приложения: клиентский QR, карты, прогресс, подарки, кабинет компании, сканер кассира и статистику. Простая пустая WebView-оболочка повышает риск отклонения.

## Android build

1. Установить JDK и Android Studio.
2. Открыть проект `android` в Android Studio.
3. Проверить `applicationId`: `ru.proplushka.app`.
4. Проверить `versionCode` и `versionName` в `android/app/build.gradle`.
5. Проверить иконки, splash screen и разрешение камеры.
6. Выполнить `npm run build`.
7. Выполнить `npx cap sync android`.
8. Для Google Play собрать signed release Android App Bundle.
9. Для RuStore собрать signed APK или AAB.

Команды:

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
./gradlew assembleRelease
```

На Windows:

```bash
npm run build
npx cap sync android
cd android
gradlew.bat bundleRelease
gradlew.bat assembleRelease
```

Debug-сборку в магазины не загружать.

## iOS build

Нужны macOS, Xcode и Apple Developer Account.

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Далее в Xcode:

1. Проверить Bundle Identifier: `ru.proplushka.app`.
2. Выбрать Team.
3. Проверить иконки и `NSCameraUsageDescription`.
4. Product -> Archive.
5. Upload to App Store Connect.

## Google Play

1. Создать аккаунт Google Play Console.
2. Создать приложение: название `ПроПлюшка`, язык русский, тип приложение.
3. Категория: сначала проверить, что лучше подходит по фактическому позиционированию. Рекомендация: `Бизнес` для B2B-лояльности или `Еда и напитки`, если основной акцент на кафе/кофейнях.
4. Загрузить signed `.aab`.
5. Добавить описание, иконку, feature graphic и скриншоты.
6. Указать политику конфиденциальности: `https://proplushka.ru/privacy`.
7. Заполнить Data safety: имя, телефон, email при наличии, история покупок/начислений, QR-токены, cookie/сессия.
8. Указать использование камеры для сканирования QR.
9. Отправить на проверку.

## RuStore

1. Зарегистрироваться в RuStore Console.
2. Создать приложение.
3. Загрузить signed `.apk` или `.aab`.
4. Заполнить карточку: название, описание, категория, возрастной рейтинг, контакты, политика конфиденциальности.
5. Заполнить декларацию разрешений, если консоль запросит её из-за камеры.
6. Добавить скриншоты и иконку.
7. Отправить на модерацию.

## App Store

1. Зарегистрировать Apple Developer Account.
2. Создать Bundle ID `ru.proplushka.app`.
3. Создать приложение в App Store Connect: название `ПроПлюшка`, SKU например `proplushka-ios-1`.
4. Загрузить сборку из Xcode.
5. Добавить описание, скриншоты для iPhone, privacy policy и App Privacy.
6. Указать камеру как доступ для сканирования QR.
7. В App Review Information добавить тестовые логины клиента и кассира, а также инструкцию проверки QR.
8. Отправить на ревью.

## Юридические ссылки

- Политика конфиденциальности: `https://proplushka.ru/privacy`
- Оферта: `https://proplushka.ru/offer`
- Удаление аккаунта: `https://proplushka.ru/account/delete`
- Поддержка: `rf173@bk.ru`

## Проверка перед модерацией

1. Приложение открывает `https://proplushka.ru`, а не localhost.
2. Авторизация сохраняется после закрытия приложения.
3. Клиентский QR отображается.
4. Камера запрашивает разрешение и сканирует QR.
5. Кассир может начислить покупку и выдать подарок.
6. Кабинет компании, настройки, история и статистика открываются.
7. Нижняя навигация не перекрывает кнопки.
8. Внешние окна не ломают WebView-сценарий.
9. `/privacy`, `/offer`, `/account/delete` открываются публично.
10. В магазинах загружается release-сборка с подписью, не debug.
