# Общие инструкции проекта

Эти правила действуют для всего репозитория, включая воркспейсы `apps/am-front` и `apps/am-back`. Дополнительные правила приложений находятся в [apps/am-front/AGENTS.md](apps/am-front/AGENTS.md) и [apps/am-back/AGENTS.md](apps/am-back/AGENTS.md).

## Подготовка

- Отвечай на русском языке.
- Проект — общий Nx workspace с Angular на фронтенде и NestJS, TypeORM и PostgreSQL на бэкенде. Команды выполняются из корня репозитория.
- Перед задачей прочитай `AGENTS.md` каждого затронутого приложения. Если задача меняет взаимодействие фронтенда и бэкенда, прочитай инструкции обоих приложений.
- Перед изменениями изучи соответствующий код, существующие решения и относящиеся к задаче тесты.
- При сверке аналитики и требований обращайся к связанным задачам и документам в [Linear amstore](https://linear.app/amstore/), включая их описания и обсуждения.
- Перед запуском dev-сервера проверь, не запущен ли он уже. Используй работающий экземпляр, если он подходит для задачи.

## Навыки агентов

- Проектные навыки хранятся в `.agents/skills/<skill-name>/`. Правила навыка находятся в `SKILL.md`, дополнительные примеры — в его папке `references`.
- При создании, изменении или ревью frontend-запросов и Angular Signal Forms используй [amstore-requests-signal-forms](.agents/skills/amstore-requests-signal-forms/SKILL.md).

## Работа с кодом и контрактами

- Переиспользуй существующие компоненты, сервисы и общие функции. Логику, общую для фронтенда и бэкенда, ищи в `libs/utils`.
- При изменении API согласуй контракт обоих приложений: обнови DTO и Swagger-описания бэкенда, затем сгенерируй клиент фронтенда. `apps/am-front/src/app/api-v2` обновляется генератором.
- Сохраняй принятые форматы ответов и ошибок API. При необходимости добавляй новые значения в `ApiErrorCodes` и `ApiEntityNames` в `apps/am-back/src/modules/errors/errors.dto.ts` и обновляй сгенерированный клиент при изменении схемы.

## TypeScript coding conventions

- Enable and respect strict TypeScript typing.
- Prefer type inference for local variables, class fields, `inject()`, `signal()` and `computed()`.
- Do not add redundant type annotations when the type is obvious from the initializer.
- Explicitly declare parameter types and return types for public methods and exported functions.
- Explicitly type API contracts, DTOs and domain models.
- Use explicit generic types for signals initialized with `null`, empty arrays or ambiguous values.
- Avoid `any` and unnecessary type assertions.
- Use `satisfies` where appropriate for validating object structures without widening inferred types.

## Авторизация и доступ

- При изменении сценариев авторизации и ролей согласуй поведение фронтенда и проверки бэкенда.
- На фронтенде используй состояние существующих сервисов авторизации и профиля для доступности интерфейса и выполнения запросов. Источники сигналов описаны в `apps/am-front/AGENTS.md`.
- На бэкенде проверяй авторизацию и необходимые роли для закрытых ручек независимо от проверок интерфейса. Используй существующие middleware и guards.
- При доступе к закрытому ресурсу проверяй его существование, допустимое состояние и право доступа к нему. Переданный клиентом идентификатор ресурса или роль не подтверждают право доступа.

## Проверка изменений

- После изменения кода запускай проверки, соответствующие задаче: сборку, линтер затронутых файлов и тесты изменённой логики. Команды приведены в `AGENTS.md` приложений.
- Для изменений бизнес-логики проверяй существенные граничные случаи и ошибки, включая отказы в доступе при изменении авторизации.
- Для изменений только в документации сборка и тесты не требуются.
- В итоговом сообщении указывай выполненные проверки и ограничения, если какая-либо проверка недоступна.
