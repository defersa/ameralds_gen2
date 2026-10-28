import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { RecaptchaDirective } from '../../recaptcha/recaptcha.directive';
import { AmstoreLoginComponent } from './login.component';

describe('login dialog email mode', () => {
    let fixture: ComponentFixture<AmstoreLoginComponent>;
    let component: AmstoreLoginComponent;
    let send: Subject<void>;
    const auth = { requestEmailLogin: jest.fn(), setToken: jest.fn() };
    const profile = { authUser: jest.fn() };
    const close = jest.fn();

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.spyOn(RecaptchaDirective.prototype, 'initRecaptchaScript').mockImplementation(() => undefined);
        send = new Subject();
        auth.requestEmailLogin.mockReturnValue(send);
        profile.authUser.mockReturnValue(of({ access: 'access' }));
        await TestBed.configureTestingModule({ imports: [AmstoreLoginComponent], providers: [
            provideNoopAnimations(), { provide: AuthService, useValue: auth }, { provide: ProfileService, useValue: profile },
            { provide: MatDialogRef, useValue: { close } },
        ] }).compileComponents();
        fixture = TestBed.createComponent(AmstoreLoginComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    afterEach(() => { fixture.destroy(); jest.restoreAllMocks(); });

    it('shows email login and requests a link without requiring a password', () => {
        expect(fixture.nativeElement.textContent).toContain('Войти через почту');
        component.authForm.controls.email.setValue('buyer@example.com');
        component.switchMode('email');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('amstore-forms-input-password')).toBeNull();
        component.login();
        component.login();
        expect(auth.requestEmailLogin).toHaveBeenCalledTimes(1);
        expect(auth.requestEmailLogin).toHaveBeenCalledWith('buyer@example.com', undefined);
        expect(profile.authUser).not.toHaveBeenCalled();
        expect(component.pending()).toBe(true);
        send.next();
        send.complete();
        fixture.detectChanges();
        expect(component.pending()).toBe(false);
        const status = fixture.nativeElement.querySelector('[role="status"]').textContent;
        expect(status).toContain('Проверьте почту');
        expect(status).toContain('Ссылка действует 7 дней');
        expect(status).not.toContain('buyer@example.com');
        expect(auth.setToken).not.toHaveBeenCalled();
        expect(close).not.toHaveBeenCalled();
    });

    it('validates the email before sending', () => {
        component.switchMode('email');
        component.authForm.controls.email.setValue('invalid');
        component.login();
        expect(auth.requestEmailLogin).not.toHaveBeenCalled();
        expect(component.pending()).toBe(false);
    });

    it('shows throttling errors and allows retrying', () => {
        component.switchMode('email');
        component.authForm.controls.email.setValue('buyer@example.com');
        component.login();
        send.error(new HttpErrorResponse({ status: 429 }));
        fixture.detectChanges();
        expect(component.pending()).toBe(false);
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Слишком много попыток');
    });

    it('preserves password login when switching back', () => {
        component.switchMode('email');
        component.switchMode('password');
        component.authForm.setValue({ email: 'buyer@example.com', password: 'Password123!' });
        component.login();
        expect(profile.authUser).toHaveBeenCalledWith({ email: 'buyer@example.com', password: 'Password123!' });
        expect(auth.setToken).toHaveBeenCalledWith({ access: 'access' });
        expect(close).toHaveBeenCalledTimes(1);
    });
});
