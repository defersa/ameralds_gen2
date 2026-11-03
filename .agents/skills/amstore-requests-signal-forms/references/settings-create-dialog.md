# Пример на основе SettingsCreateDialogComponent

Источник для сверки — актуальный файл `apps/am-front/src/app/features/main/admin/modules/settings/create-dialog/settings-create-dialog.component.ts` в репозитории Amstore. Пример ниже иллюстрирует композицию обёртки запроса, модели и Signal Forms, а не заменяет компонент целиком.

## Поля компонента и схема

Фрагмент предполагает импорты из `@angular/core`, `@angular/forms/signals`, `@angular/material/dialog`, существующего `AppSettingsService`, API DTO и `createRequestWrapper`.

```ts
interface SettingsFormModel {
    paymentExpirationDays: number | null;
}

// Поля внутри класса диалога.
private readonly settings = inject(AppSettingsService);
private readonly initialVersion = inject<AppSettingsVersionDto>(MAT_DIALOG_DATA);
private readonly dialogRef = inject(
    MatDialogRef<SettingsCreateDialogComponent, AppSettingsVersionDto>,
);

public readonly createRequest = createRequestWrapper<typeof this.settings.create>(
    this.settings.create.bind(this.settings),
);
public readonly current = signal(this.initialVersion);
public readonly model = signal<SettingsFormModel>({
    paymentExpirationDays: this.initialVersion.effective.orders.paymentExpirationDays,
});
public readonly settingsForm = form(this.model, path => {
    required(path.paymentExpirationDays);
    min(path.paymentExpirationDays, 1);
    max(path.paymentExpirationDays, 365);
    disabled(path.paymentExpirationDays, {
        when: () => this.createRequest.loading(),
    });
});
```

У такого набора валидаторов `1.5` находится внутри диапазона и проходит проверку. Если контракт требует целое число, дополни схему валидатором `validate(... => ... ? null : { kind: 'integer' })` и используй общий шаблон `integer`. Это решение должно следовать контракту, а не внешнему виду поля.

## Отправка

```ts
public save(event?: Event): void {
    event?.preventDefault();
    this.settingsForm.paymentExpirationDays().markAsTouched();

    if (this.dialogRef.getState() !== MatDialogState.OPEN
        || this.createRequest.loading() || this.settingsForm().invalid()) {
        return;
    }

    const paymentExpirationDays = this.model().paymentExpirationDays;
    if (paymentExpirationDays === null) return;

    this.createRequest.request({
        expectedVersion: this.current().version,
        changes: { orders: { paymentExpirationDays } },
    }).subscribe(version => this.dialogRef.close(version));
}
```

Обёртка отвечает за `loading/status/errors` и завершение подписки при уничтожении. В реальном диалоге дополнительно согласуй `disableClose` и кнопку отмены с `.loading()`. Ошибки обрабатываются состоянием обёртки: subscriber `error` не получит перехваченную HTTP-ошибку. Для `VERSION_CONFLICT` нужен отдельный пользовательский сценарий перезагрузки версии, а не автоматический повтор POST.

## Контрол и кнопка

```html
<form (submit)="save($event)" novalidate>
    <amstore-input-signal
        type="number"
        label="Срок оплаты заказа, дней"
        [formField]="settingsForm.paymentExpirationDays"
    />
    @if (createRequest.status() === 'error') {
        <p role="alert">Не удалось сохранить настройки. Проверьте данные и повторите попытку.</p>
    }
    <button amstore-button-round type="submit"
            [disabled]="createRequest.loading() || settingsForm().invalid()">
        {{ createRequest.loading() ? 'Сохраняем…' : 'Сохранить' }}
    </button>
</form>
```

`amstore-input-signal` получает ошибки через `FormField` и передаёт их существующему `ErrorsPipe`. Для обязательного поля используется общий `required`, для пределов — `min/max`; тексты и формат payload берутся из `error-message-builder.ts`. В зависимости от типа ошибки запроса замени общий fallback существующим отображением кодов API, сохранив единый источник состояния `createRequest`.
