import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { disabled, email, form, FormField, maxLength, required } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogState, MatDialogTitle } from '@angular/material/dialog';
import { ApiErrorCodes } from '@ameralds/utils';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { AmstoreInputSignalComponent } from '@am-front/cdk/signal-forms';
import { IconsComponent } from '@am-front/cdk/icons/icons.component';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';
import { RecaptchaDirective } from '../../recaptcha/recaptcha.directive';


interface LoginDialogData {
    emailLogin?: boolean;
    redirectPath?: string;
}

interface LoginFormModel {
    email: string;
    password: string;
}

@Component({
    selector: 'amstore-dialog-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        AmstoreInputSignalComponent,
        FormField,
        AmstoreButtonComponent,
        IconsComponent,
    ],
})
export class AmstoreLoginComponent extends RecaptchaDirective {
    private readonly matDialogRef = inject(MatDialogRef<AmstoreLoginComponent>);
    private readonly authService = inject(AuthService);
    private readonly profileService = inject(ProfileService);
    private readonly data = inject<LoginDialogData>(MAT_DIALOG_DATA, { optional: true });

    public readonly passwordRequest = createRequestWrapper<typeof this.profileService.authUser>(
        this.profileService.authUser.bind(this.profileService),
    );

    public readonly emailRequest = createRequestWrapper<typeof this.authService.requestEmailLogin>(
        this.authService.requestEmailLogin.bind(this.authService),
    );

    public readonly mode = signal<'password' | 'email'>(this.data?.emailLogin ? 'email' : 'password');
    public readonly passwordVisible = signal(false);
    public readonly pending = computed(() => this.passwordRequest.loading() || this.emailRequest.loading());
    public readonly requested = computed(() => this.emailRequest.status() === 'success');

    public readonly model = signal<LoginFormModel>({
        email: '',
        password: '',
    });

    public readonly authForm = form(this.model, path => {
        required(path.email);
        email(path.email);
        maxLength(path.email, 254);
        required(path.password);
        disabled(path, { when: () => this.pending() });
        disabled(path.password, { when: () => this.mode() === 'email' });
    }, { name: 'login' });

    public readonly error = computed(() => {
        const error = this.mode() === 'email' ? this.emailRequest.errors() : this.passwordRequest.errors();

        if (!error) {
            return null;
        }

        if (error instanceof HttpErrorResponse && error.status === 429) {
            return 'Слишком много попыток. Попробуйте позже';
        }

        if (this.mode() === 'email') {
            return 'Не удалось принять запрос. Попробуйте ещё раз позже';
        }

        if (error instanceof HttpErrorResponse) {
            const response: unknown = error.error;

            if (error.status === 401 && response && typeof response === 'object' &&
                'code' in response && response.code === ApiErrorCodes.EMAIL_CONFIRMATION_REQUIRED) {
                return 'Проверьте почту и подтвердите регистрацию по ссылке из письма. После подтверждения вы сможете войти с паролем.';
            }

            if (error.status === 401) {
                return 'Неверный логин или пароль';
            }
        }

        return 'Не удалось войти. Попробуйте ещё раз позже';
    });

    /** Блокирует закрытие диалога во время запроса и снова разрешает его после ответа или ошибки. */
    constructor() {
        super();

        effect(() => {
            this.matDialogRef.disableClose = this.pending();
        });
    }

    /** Переключает способ входа вне запроса, сохраняя введённые данные и очищая предыдущий результат. */
    public switchMode(mode: 'password' | 'email'): void {
        if (this.pending() || this.matDialogRef.getState() !== MatDialogState.OPEN) {
            return;
        }

        this.mode.set(mode);
        this.clearResult();
    }

    /** Убирает сообщения предыдущей попытки после редактирования полей, не сбрасывая текущий запрос. */
    public clearResult(): void {
        if (this.pending()) {
            return;
        }

        this.passwordRequest.clear();
        this.emailRequest.clear();
    }

    /** Переключает видимость пароля без отправки формы. */
    public togglePasswordVisibility(): void {
        this.passwordVisible.update(visible => !visible);
    }

    /**
     * Отправляет валидную форму выбранным способом, предотвращая повторную отправку и запрос при закрытии.
     * Вход по паролю сохраняет сессию; запрос ссылки показывает инструкции без раскрытия наличия аккаунта.
     */
    public login(event?: Event): void {
        event?.preventDefault();

        if (this.pending() || this.matDialogRef.getState() !== MatDialogState.OPEN) {
            return;
        }

        this.authForm().markAsTouched();

        if (this.authForm().invalid()) {
            return;
        }

        const email = this.model().email.trim().toLowerCase();

        this.matDialogRef.disableClose = true;

        if (this.mode() === 'email') {
            this.emailRequest.request(email, this.data?.redirectPath).subscribe();

            return;
        }

        this.passwordRequest.request({
            email,
            password: this.model().password,
        }).subscribe(result => {
            this.authService.setToken(result);
            this.matDialogRef.close();
        });
    }

    /** Закрывает диалог, если запрос входа или отправки письма не выполняется. */
    public close(): void {
        if (this.pending()) {
            return;
        }

        this.matDialogRef.close();
    }
}
