# utils

Общий TypeScript-код фронтенда и бэкенда без зависимостей от Angular, NestJS и TypeORM.

Константы находятся в `src/lib/constants` и доступны через `@ameralds/utils`:

- `api-errors.ts` — `ApiErrorCodes` и `ApiEntityNames`;
- `numeric-limits.ts` — границы целых чисел;
- `pagination.ts` — первая страница, размер страницы и предел номера страницы;
- `time.ts` — единицы времени.

```ts
import { ApiErrorCodes, DEFAULT_PAGE_SIZE, FIRST_PAGE } from "@ameralds/utils";
```

Значения, специфичные для одной предметной области, остаются в её модуле.

Сборка: `npx nx build utils`. Тесты: `npx nx test utils`.
