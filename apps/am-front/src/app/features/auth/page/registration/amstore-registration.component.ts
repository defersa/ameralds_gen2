import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { disabled, email, form, FormField, maxLength, required, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { isStrongPassword } from '@ameralds/utils';
import { AmstoreButtonRoundComponent } from '@am-front/cdk/buttons/round/round.component';
import { AmstorePanelBasicComponent } from '@am-front/cdk/panel/panel-basic/amstore-panel-basic.component';
import { AmstoreCheckboxSignalComponent, AmstoreInputSignalComponent } from '@am-front/cdk/signal-forms';
import { DialogService } from '@am-front/core/dialog/dialog.service';
import { ProfileService } from '@am-front/services/profile.service';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';


interface RegistrationFormModel {
    email: string;
    password: string;
    passwordRepeat: string;
    firstName: string;
    lastName: string;
    isAccept: boolean;
}

@Component({
    selector: 'amstore-registration',
    templateUrl: './amstore-registration.component.html',
    styleUrls: ['./amstore-registration.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AmstorePanelBasicComponent,
        AmstoreInputSignalComponent,
        AmstoreCheckboxSignalComponent,
        AmstoreButtonRoundComponent,
        FormField,
    ],
})
export class AmstoreRegistrationComponent {
    private readonly profileService = inject(ProfileService);
    private readonly dialogService = inject(DialogService);
    private readonly router = inject(Router);

    public readonly createRequest = createRequestWrapper<typeof this.profileService.createUser>(
        this.profileService.createUser.bind(this.profileService),
    );

    public readonly model = signal<RegistrationFormModel>({
        email: '',
        password: '',
        passwordRepeat: '',
        firstName: '',
        lastName: '',
        isAccept: false,
    });

    public readonly passwordVisible = signal(false);
    public readonly passwordRepeatVisible = signal(false);

    public readonly regForm = form(this.model, path => {
        required(path.email);
        email(path.email);
        maxLength(path.email, 254);
        required(path.password);
        validate(path.password, ({ value }) =>
            !value() || isStrongPassword(value()) ? null : { kind: 'notComplexity' });
        required(path.passwordRepeat);
        validate(path.passwordRepeat, ({ value, valueOf }) =>
            !value() || value() === valueOf(path.password) ? null : { kind: 'notEqualPassword' });
        required(path.isAccept);
        disabled(path, { when: () => this.createRequest.loading() });
    }, { name: 'registration' });

    public readonly requestError = computed(() => {
        const error = this.createRequest.errors();

        if (!error) {
            return null;
        }

        return error instanceof HttpErrorResponse && error.status === 429
            ? 'Слишком много попыток. Попробуйте позже'
            : 'Не удалось принять запрос. Проверьте данные и попробуйте позже';
    });

    /** Переключает видимость выбранного пароля, сохраняя значение поля. */
    public togglePasswordVisibility(repeat: boolean): void {
        const visible = repeat ? this.passwordRepeatVisible : this.passwordVisible;

        visible.update(value => !value);
    }

    /**
     * Отправляет валидные данные после согласия с условиями, блокируя повторный запрос.
     * После успеха открывает инструкции по почте; ошибку отображает состояние запроса.
     */
    public sendUser(event?: Event): void {
        event?.preventDefault();

        if (this.createRequest.loading()) {
            return;
        }

        this.regForm().markAsTouched();

        if (this.regForm().invalid()) {
            return;
        }

        const { email, password } = this.model();

        this.createRequest.request({
            email: email.trim().toLowerCase(),
            password,
        }).subscribe(() => {
            // Переход уничтожает форму, поэтому открытие общего диалога
            // выполняется независимо от подписки запроса после навигации.
            void this.router.navigate(['/']).then(
                () => this.showEmailInstructions(),
                () => this.showEmailInstructions(),
            );
        });
    }

    /** Показывает нейтральные инструкции, не раскрывая наличие аккаунта с указанной почтой. */
    private showEmailInstructions(): void {
        this.dialogService.openInfoDialog({
            minWidth: '0',
            width: '440px',
            maxWidth: 'calc(100vw - 32px)',
            data: {
                title: 'Проверьте почту',
                smallTitle: 'Запрос принят.',
                text: 'Если для указанного адреса доступна регистрация или вход, на него придёт письмо с дальнейшими действиями. Ссылка действует 7 дней.',
            },
        });
    }
}
