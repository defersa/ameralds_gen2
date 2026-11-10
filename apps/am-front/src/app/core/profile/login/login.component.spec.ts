import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogState } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Subject } from 'rxjs';
import { ApiErrorCodes } from '@ameralds/utils';
import { UserTokensDTO } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { RecaptchaDirective } from '../../recaptcha/recaptcha.directive';
import { AmstoreLoginComponent } from './login.component';


describe('login dialog', () => {
    let fixture: ComponentFixture<AmstoreLoginComponent>;
    let component: AmstoreLoginComponent;
    let send: Subject<void>;
    let passwordSend: Subject<UserTokensDTO>;
    let dialogState: MatDialogState;

    const auth = { requestEmailLogin: jest.fn(), setToken: jest.fn() };
    const profile = { authUser: jest.fn() };

    const dialogRef = {
        close: jest.fn(() => {
            dialogState = MatDialogState.CLOSING;
        }),
        getState: jest.fn(() => dialogState),
        disableClose: false,
    };

    const data: { emailLogin?: boolean; redirectPath?: string } = {};

    /** Находит настоящий input для проверки автозаполнения и взаимодействия с Signal Forms. */
    function getInput(autocomplete: string): HTMLInputElement {
        return fixture.nativeElement.querySelector('input[autocomplete="' + autocomplete + '"]');
    }

    /** Имитирует ввод либо change от менеджера паролей и обновляет представление. */
    function fillInput(autocomplete: string, value: string, eventType = 'input'): void {
        const input = getInput(autocomplete);

        input.value = value;
        input.dispatchEvent(new Event(eventType, { bubbles: true }));
        fixture.detectChanges();
    }

    /** Заполняет учётные данные через DOM, сохраняя проверку настоящих привязок формы. */
    function fillCredentials(): void {
        fillInput('username', 'Buyer@Example.com');
        fillInput('current-password', 'Password123!');
    }

    /** Отправляет форму обычной кнопкой submit, как при нажатии мышью или касании. */
    function submitForm(): void {
        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');

        button.click();
        fixture.detectChanges();
    }

    beforeEach(async () => {
        jest.clearAllMocks();
        dialogState = MatDialogState.OPEN;
        dialogRef.disableClose = false;
        delete data.emailLogin;
        delete data.redirectPath;
        jest.spyOn(RecaptchaDirective.prototype, 'initRecaptchaScript').mockImplementation(() => undefined);
        send = new Subject<void>();
        passwordSend = new Subject<UserTokensDTO>();
        auth.requestEmailLogin.mockReturnValue(send);
        profile.authUser.mockReturnValue(passwordSend);

        await TestBed.configureTestingModule({
            imports: [AmstoreLoginComponent],
            providers: [
                provideNoopAnimations(),
                { provide: AuthService, useValue: auth },
                { provide: ProfileService, useValue: profile },
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: data },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AmstoreLoginComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
        jest.restoreAllMocks();
    });

    it('exposes stable username and current-password fields inside a native submit form', () => {
        const email = getInput('username');
        const password = getInput('current-password');
        const submit: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');

        expect(email.type).toBe('email');
        expect(email.name).toBe('login.email');
        expect(password.type).toBe('password');
        expect(password.name).toBe('login.password');
        expect(password.form).toBe(email.form);
        expect(submit.form).toBe(email.form);
        expect(email.labels?.length).toBe(1);
        expect(password.labels?.length).toBe(1);
    });

    it('accepts change-only autofill and submits the normalized credentials exactly once', () => {
        fillInput('username', 'Buyer@Example.com', 'change');
        fillInput('current-password', 'Password123!', 'change');
        submitForm();
        component.login();
        submitForm();

        expect(profile.authUser).toHaveBeenCalledTimes(1);
        expect(profile.authUser).toHaveBeenCalledWith({
            email: 'buyer@example.com',
            password: 'Password123!',
        });
        expect(component.pending()).toBe(true);
        expect(dialogRef.disableClose).toBe(true);
    });

    it('shows and hides the password without submitting or losing its value', () => {
        fillCredentials();

        const show: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Показать пароль"]');

        show.click();
        fixture.detectChanges();

        expect(getInput('current-password').type).toBe('text');
        expect(component.model().password).toBe('Password123!');
        expect(profile.authUser).not.toHaveBeenCalled();

        const hide: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Скрыть пароль"]');

        hide.click();
        fixture.detectChanges();

        expect(getInput('current-password').type).toBe('password');
    });

    it('shows email login and requests a link without requiring a password', () => {
        fillInput('username', 'buyer@example.com');
        component.switchMode('email');
        fixture.detectChanges();

        expect(getInput('current-password')).toBeNull();

        submitForm();
        component.login();

        expect(auth.requestEmailLogin).toHaveBeenCalledTimes(1);
        expect(auth.requestEmailLogin).toHaveBeenCalledWith('buyer@example.com', undefined);
        expect(profile.authUser).not.toHaveBeenCalled();
        expect(component.pending()).toBe(true);

        send.next();
        send.complete();
        fixture.detectChanges();

        const status: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');

        expect(component.pending()).toBe(false);
        expect(status.textContent).toContain('Проверьте почту');
        expect(status.textContent).toContain('Ссылка действует 7 дней');
        expect(status.textContent).not.toContain('buyer@example.com');
        expect(auth.setToken).not.toHaveBeenCalled();
        expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('validates required fields and email before sending and clears errors after correction', () => {
        submitForm();

        expect(fixture.nativeElement.textContent).toContain('Это поле обязательно');
        expect(profile.authUser).not.toHaveBeenCalled();

        component.switchMode('email');
        fixture.detectChanges();
        fillInput('username', 'invalid');
        submitForm();

        expect(fixture.nativeElement.textContent).toContain('Email не корректен');
        expect(auth.requestEmailLogin).not.toHaveBeenCalled();

        fillInput('username', 'buyer@example.com');

        expect(component.authForm().valid()).toBe(true);
        expect(fixture.nativeElement.textContent).not.toContain('Email не корректен');
    });

    it('shows throttling errors and allows retrying the email request', () => {
        component.switchMode('email');
        fillInput('username', 'buyer@example.com');
        submitForm();
        send.error(new HttpErrorResponse({ status: 429 }));
        fixture.detectChanges();

        expect(component.pending()).toBe(false);
        expect(dialogRef.disableClose).toBe(false);
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Слишком много попыток');

        auth.requestEmailLogin.mockReturnValue(new Subject<void>());
        submitForm();

        expect(auth.requestEmailLogin).toHaveBeenCalledTimes(2);
        expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('preserves password login when switching back and closes after receiving a session', () => {
        component.switchMode('email');
        component.switchMode('password');
        fillCredentials();
        submitForm();
        passwordSend.next({ access: 'access' });
        fixture.detectChanges();

        expect(auth.setToken).toHaveBeenCalledWith({ access: 'access' });
        expect(dialogRef.close).toHaveBeenCalledTimes(1);
    });

    it('asks to confirm email when the backend recognizes a pending registration', () => {
        fillCredentials();
        submitForm();
        passwordSend.error(new HttpErrorResponse({
            status: 401,
            error: { code: ApiErrorCodes.EMAIL_CONFIRMATION_REQUIRED },
        }));
        fixture.detectChanges();

        const alert: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');

        expect(alert.textContent).toContain('Проверьте почту и подтвердите регистрацию');
        expect(alert.textContent).not.toContain('Неверный логин или пароль');
        expect(auth.setToken).not.toHaveBeenCalled();
        expect(dialogRef.close).not.toHaveBeenCalled();
        expect(dialogRef.disableClose).toBe(false);

        fillInput('current-password', 'Changed123!');

        expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it.each([
        { status: 401, message: 'Неверный логин или пароль' },
        { status: 429, message: 'Слишком много попыток' },
        { status: 500, message: 'Не удалось войти. Попробуйте ещё раз позже' },
    ])('shows a suitable password login error for HTTP $status', ({ status, message }) => {
        fillCredentials();
        submitForm();
        passwordSend.error(new HttpErrorResponse({
            status,
            error: { code: ApiErrorCodes.INVALID_CREDENTIALS },
        }));
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(message);
        expect(component.pending()).toBe(false);
        expect(auth.setToken).not.toHaveBeenCalled();
    });

    it('prevents mode changes and close button actions during a pending request', () => {
        fillCredentials();
        submitForm();
        component.switchMode('email');
        component.close();

        expect(component.mode()).toBe('password');
        expect(dialogRef.close).not.toHaveBeenCalled();
        expect(dialogRef.disableClose).toBe(true);
    });

    it('does not send requests while the dialog is closing', () => {
        fillCredentials();
        component.close();
        component.login();

        expect(profile.authUser).not.toHaveBeenCalled();
        expect(auth.requestEmailLogin).not.toHaveBeenCalled();
    });

    it('uses initial email mode and preserves the supplied redirect path', () => {
        fixture.destroy();
        data.emailLogin = true;
        data.redirectPath = '/account/orders/42';
        fixture = TestBed.createComponent(AmstoreLoginComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        fillInput('username', 'buyer@example.com');
        submitForm();

        expect(component.mode()).toBe('email');
        expect(auth.requestEmailLogin).toHaveBeenCalledWith('buyer@example.com', '/account/orders/42');
    });
});
