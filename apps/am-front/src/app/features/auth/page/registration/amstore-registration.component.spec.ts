import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { DialogService } from '@am-front/core/dialog/dialog.service';
import { ProfileService } from '@am-front/services/profile.service';
import { AmstoreRegistrationComponent } from './amstore-registration.component';


describe('registration email confirmation', () => {
    let fixture: ComponentFixture<AmstoreRegistrationComponent>;
    let component: AmstoreRegistrationComponent;
    let request: Subject<void>;

    const profile = { createUser: jest.fn() };
    const dialog = { openInfoDialog: jest.fn() };

    /** Находит настоящий input внутри сигнального контрола для проверки ввода и автозаполнения. */
    function getInput(selector: string): HTMLInputElement {
        return fixture.nativeElement.querySelector(selector);
    }

    /** Вводит значение через DOM, чтобы проверить привязку FormField и сообщения ошибок. */
    function fillInput(selector: string, value: string): void {
        const input = getInput(selector);

        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();
    }

    /** Отправляет форму нативным событием submit и проверяет отмену перезагрузки страницы. */
    function submitForm(): void {
        const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
        const event = new Event('submit', { bubbles: true, cancelable: true });

        form.dispatchEvent(event);
        fixture.detectChanges();
        expect(event.defaultPrevented).toBe(true);
    }

    beforeEach(async () => {
        jest.clearAllMocks();
        request = new Subject<void>();
        profile.createUser.mockReturnValue(request);

        await TestBed.configureTestingModule({
            imports: [AmstoreRegistrationComponent],
            providers: [
                provideRouter([]),
                provideNoopAnimations(),
                { provide: ProfileService, useValue: profile },
                { provide: DialogService, useValue: dialog },
            ],
        }).compileComponents();

        jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(AmstoreRegistrationComponent);
        component = fixture.componentInstance;
        component.model.set({
            email: 'Buyer@Example.com',
            password: 'Password123!',
            passwordRepeat: 'Password123!',
            firstName: '',
            lastName: '',
            isAccept: true,
        });
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('exposes username and new-password semantics on native inputs inside a submit form', () => {
        const email = getInput('input[autocomplete="username"]');
        const password = getInput('amstore-input-signal[label="Пароль"] input');
        const repeat = getInput('amstore-input-signal[label="Повторите пароль"] input');
        const submit: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');

        expect(email.type).toBe('email');
        expect(email.name).toContain('email');
        expect(password.type).toBe('password');
        expect(password.autocomplete).toBe('new-password');
        expect(password.name).toContain('password');
        expect(repeat.type).toBe('password');
        expect(repeat.autocomplete).toBe('new-password');
        expect(repeat.name).not.toBe(password.name);
        expect(password.form).toBe(email.form);
        expect(submit.form).toBe(email.form);
        expect(email.labels?.length).toBe(1);
    });

    it('toggles each password independently without submitting or changing its value', () => {
        const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('amstore-input-signal[label="Пароль"] button');

        toggle.click();
        fixture.detectChanges();

        expect(getInput('amstore-input-signal[label="Пароль"] input').type).toBe('text');
        expect(getInput('amstore-input-signal[label="Повторите пароль"] input').type).toBe('password');
        expect(component.model().password).toBe('Password123!');
        expect(profile.createUser).not.toHaveBeenCalled();

        toggle.click();
        fixture.detectChanges();

        expect(getInput('amstore-input-signal[label="Пароль"] input').type).toBe('password');
    });

    it('prevents duplicate requests and asks the user to check email without claiming an account was created', async () => {
        submitForm();
        component.sendUser();

        expect(profile.createUser).toHaveBeenCalledTimes(1);
        expect(profile.createUser).toHaveBeenCalledWith({
            email: 'buyer@example.com',
            password: 'Password123!',
        });
        expect(component.createRequest.loading()).toBe(true);
        expect(getInput('input[autocomplete="username"]').disabled).toBe(true);

        request.next();
        request.complete();
        await fixture.whenStable();

        expect(component.createRequest.loading()).toBe(false);
        expect(dialog.openInfoDialog).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                title: 'Проверьте почту',
                smallTitle: 'Запрос принят.',
            }),
        }));
        expect(JSON.stringify(dialog.openInfoDialog.mock.calls)).not.toContain('Профиль успешно создан');
    });

    it('still opens email instructions when navigation destroys the registration component', async () => {
        jest.mocked(TestBed.inject(Router).navigate).mockImplementation(() => {
            fixture.destroy();

            return Promise.resolve(true);
        });

        component.sendUser();
        request.next();
        await Promise.resolve();

        expect(dialog.openInfoDialog).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ title: 'Проверьте почту' }),
        }));
    });

    it.each([400, 429, 500])('shows a safe message for HTTP %s and allows retrying', status => {
        submitForm();
        request.error(new HttpErrorResponse({
            status,
            error: { code: 'ALREADY_EXIST' },
        }));
        fixture.detectChanges();

        const alert: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');

        expect(component.createRequest.loading()).toBe(false);
        expect(alert.textContent).toContain(status === 429
            ? 'Слишком много попыток. Попробуйте позже'
            : 'Не удалось принять запрос. Проверьте данные и попробуйте позже');
        expect(alert.textContent).not.toContain('ALREADY_EXIST');
        expect(dialog.openInfoDialog).not.toHaveBeenCalled();
        expect(getInput('input[autocomplete="username"]').disabled).toBe(false);

        const retry = new Subject<void>();

        profile.createUser.mockReturnValue(retry);
        submitForm();

        expect(profile.createUser).toHaveBeenCalledTimes(2);
        expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('requires acceptance of registration terms even when submitted directly', () => {
        const checkbox = getInput('input[type="checkbox"]');

        checkbox.click();
        fixture.detectChanges();
        component.sendUser();

        expect(component.model().isAccept).toBe(false);
        expect(component.regForm().invalid()).toBe(true);
        expect(profile.createUser).not.toHaveBeenCalled();
    });

    it('shows required and email errors through the control and clears them after correction', () => {
        fillInput('input[autocomplete="username"]', '');
        submitForm();

        expect(fixture.nativeElement.textContent).toContain('Это поле обязательно');
        expect(profile.createUser).not.toHaveBeenCalled();

        fillInput('input[autocomplete="username"]', 'invalid');

        expect(fixture.nativeElement.textContent).toContain('Email не корректен');

        fillInput('input[autocomplete="username"]', 'valid@example.com');

        expect(component.regForm.email().valid()).toBe(true);
        expect(fixture.nativeElement.textContent).not.toContain('Email не корректен');
    });

    it('preserves the email length limit and displays the shared error message', () => {
        fillInput('input[autocomplete="username"]', 'a'.repeat(245) + '@example.com');
        submitForm();

        expect(fixture.nativeElement.textContent).toContain('Максимальное количество символов — 254');
        expect(profile.createUser).not.toHaveBeenCalled();
    });

    it.each(['short', 'abcdefgh1', 'ABCDEFGH1', 'Aa1' + 'x'.repeat(70)])(
        'rejects a password outside the shared password policy: %s',
        password => {
            fillInput('amstore-input-signal[label="Пароль"] input', password);
            submitForm();

            expect(fixture.nativeElement.textContent).toContain('Слишком простой пароль');
            expect(profile.createUser).not.toHaveBeenCalled();
        },
    );

    it('revalidates password confirmation when the original password changes', () => {
        fillInput('amstore-input-signal[label="Повторите пароль"] input', 'Password123!');
        fillInput('amstore-input-signal[label="Пароль"] input', 'Changed123!');
        submitForm();

        expect(fixture.nativeElement.textContent).toContain('Пароли не совпадают!');
        expect(profile.createUser).not.toHaveBeenCalled();

        fillInput('amstore-input-signal[label="Повторите пароль"] input', 'Changed123!');

        expect(component.regForm.passwordRepeat().valid()).toBe(true);
        expect(fixture.nativeElement.textContent).not.toContain('Пароли не совпадают!');

        submitForm();

        expect(profile.createUser).toHaveBeenCalledWith({
            email: 'buyer@example.com',
            password: 'Changed123!',
        });
    });
});
