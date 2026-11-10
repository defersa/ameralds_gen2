# AppSettings (AMS-5)

Перед запуском приложения применить миграции:

```sh
npm run am:back:typeorm:migration:run
```

`AppSettingsService` при старте читает максимальную `version` либо атомарно создаёт
v1. Все последующие чтения обращаются к БД, поэтому настройки актуальны и при
нескольких backend-инстансах. `getRaw('orders.paymentExpirationDays')` возвращает
`undefined` для отсутствующего поля, `get(...)` — default 7. Повреждённый JSON,
неверные типы и ошибки БД приводят к ошибке, а не к подстановке default.

`createVersion(expectedVersion, changes, createdById)` принимает только разрешённые
изменения; сейчас это `{ orders: { paymentExpirationDays: 1..365 } }` (целое число).
Метод копирует полный предыдущий JSON, сохраняет неизвестные поля и создаёт новую
версию в транзакции под общей PostgreSQL advisory lock. Устаревшая версия даёт
HTTP 409 / `VERSION_CONFLICT`; некорректные изменения — HTTP 400 / `INVALID`.
Существующие версии защищены от UPDATE, DELETE и TRUNCATE триггерами БД.
Автор не может быть физически удалён, пока на него ссылается история (RESTRICT).

Схема только расширяется. При добавлении настройки обновлять типы, registry и
defaults, сохраняя deprecated-поля. Чтение и whitelist изменений используют registry. Изменение
default не меняет старые JSON и не гарантирует воспроизведение их эффективных
значений: бизнес-результат фиксировать в заказе.

## Структура

`AppSettingsDomainModule` экспортирует один `AppSettingsService`: инициализацию,
чтение текущей конфигурации, версии и истории, создание следующей версии.

- `app-settings.service.ts` — правила версионирования и границы транзакций;
- `repositories/app-settings.repository.ts` — запросы, безопасная выборка автора и advisory lock;
- `app-settings.schema.ts` — registry, defaults и проверка snapshot;
- `app-settings.mapper.ts` — преобразование версии в DTO.

Создание версии использует READ COMMITTED и общую advisory lock, история —
REPEATABLE READ. Все запросы внутри транзакции получают тот же EntityManager.
Репозиторий остаётся приватным, сущности не покидают модуль.

## Границы связанных задач

Административная страница `/admin/settings` и API реализованы в
[AMS-6](https://linear.app/amstore/issue/AMS-6). Все endpoints защищены
`@Auth()` и `@Roles(UserRole.ADMIN)`; автор берётся из `RequestModel.user`.

| Метод | URL (с общим префиксом `/api`) | Ответ |
| --- | --- | --- |
| GET | `/admin/app-settings` | Активная версия, snapshot и effective значения |
| GET | `/admin/app-settings/list/:page` | 10 версий по `version DESC`, `page`, `count` страниц, `total`, `activeVersion` |
| GET | `/admin/app-settings/:version` | Конкретная версия, только для чтения |
| POST | `/admin/app-settings` | Новая активная версия |

Тело POST: `{ "expectedVersion": 1, "changes": { "orders": { "paymentExpirationDays": 14 } } }`.
Неизвестные поля, включая попытку передать автора/секреты, отклоняются.
DTO автора содержит только id, username и email. Пагинация использует один
REPEATABLE READ snapshot БД для списка и метаданных. PATCH/DELETE отсутствуют.

Страница использует Signal Forms и существующие компоненты админки. При конфликте
черновик остаётся в форме; после явной перезагрузки актуальных настроек можно
повторить сохранение с новой базовой версией, сохранив введённое значение.

Checkout реализуется в [AMS-9](https://linear.app/amstore/issue/AMS-9). После
проверки состава и фиксации стоимости он должен вызвать
`OrderCheckoutService.startPaymentWindow(orderId, userId, manager)` в той же
транзакции. Метод блокирует заказ, проверяет пользователя/состояние, фиксирует
`paymentExpiresAt` и `appSettingsVersion`, переводит OPEN в PENDING_PAYMENT.
Повтор для того же pending не продлевает срок. Один день равен 24 часам, время
берётся из PostgreSQL. Изменение срока/версии после оформления запрещено БД.
Административные покупки продолжают завершаться со статусом PAID (`success`).
Денежный и товарный snapshot фиксируется перед переходом в pending;
модель и порядок вызовов описаны в [документации заказов](../order/README.md).

Cron каждую минуту атомарно отменяет только просроченные активные pending-заказы
без `sourceAdminOrder`. Операция идемпотентна между инстансами. Legacy-статусы
`success` и `cancel` сохранены (соответствуют PAID и CANCELLED).

При подключении платежей ([AMS-10](https://linear.app/amstore/issue/AMS-10),
[AMS-12](https://linear.app/amstore/issue/AMS-12)) нужно блокировать строку заказа
до проверки провайдера и завершать оплату только условным переходом из
PENDING_PAYMENT в той же транзакции. Автоотмена ждёт такую транзакцию и повторно
проверяет статус; завершённую оплату она не отменит. БД запрещает повторное
открытие отменённого заказа, включая безусловный UPDATE. Долгоживущие попытки
оплаты и компенсация реально списанных средств после отмены относятся к будущему
платёжному контуру. Модель попыток и абстракция провайдера добавлены в
[AMS-10](../payment/README.md); завершение заказа и обработка поздних списаний — AMS-12.

## Проверки

```sh
npx nx run am-back:test --runInBand --testPathPatterns=app-settings
```

Интеграционные тесты включаются переменной `APP_SETTINGS_TEST_DATABASE_URL`.
Пользователю БД требуется право CREATE DATABASE: тесты создают случайно названную
БД `ams5_test_*`, применяют/откатывают настоящую миграцию и удаляют эту БД.
Исходная БД из URL не изменяется. Например, для локального одноразового PostgreSQL:

```sh
APP_SETTINGS_TEST_DATABASE_URL=postgres://postgres:ams5-test@127.0.0.1:25435/postgres \
  npx nx run am-back:test --runInBand --testPathPatterns=app-settings
```

Без переменной пропускаются только PostgreSQL-тесты. Они проверяют блокировки
нескольких инстансов, версии, совместимость JSON, миграцию up/down, неизменяемость
и гонки оплаты/автоотмены на минимальной исходной схеме заказов.
