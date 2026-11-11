import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { AuthService } from '@am-front/services/auth.service';
import { DialogService } from '@am-front/core/dialog/dialog.service';
import { ProfileService } from '@am-front/services/profile.service';
import { AmstoreRegistrationComponent } from '../registration/amstore-registration.component';
import { EmailLoginComponent } from './email-login.component';


describe('email login callback', () => {
    const signInWithEmailLink = jest.fn();
    const replaceState = jest.fn();
    const openCustomDialog = jest.fn();
    const createUser = jest.fn();
    let session: Subject<string>;
    let route: { snapshot: { fragment: string | null } };
    let navigate: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        session = new Subject();
        signInWithEmailLink.mockReturnValue(session);
        createUser.mockReturnValue(new Subject<void>());
        route = { snapshot: { fragment: 'token=secret' } };
        TestBed.configureTestingModule({ imports: [EmailLoginComponent], providers: [
            provideRouter([
                { path: 'auth/email', component: EmailLoginComponent },
                { path: 'auth/registration', component: AmstoreRegistrationComponent },
            ]),
            provideLocationMocks(),
            provideNoopAnimations(),
            { provide: ActivatedRoute, useValue: route },
            { provide: AuthService, useValue: { signInWithEmailLink } }, { provide: DialogService, useValue: { openCustomDialog } },
            { provide: ProfileService, useValue: { createUser } },
        ] });
        jest.spyOn(TestBed.inject(Location), 'replaceState').mockImplementation(replaceState);
        navigate = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    });

    it('removes the token from the address and replaces the callback with the saved destination', async () => {
        TestBed.createComponent(EmailLoginComponent);
        expect(replaceState).toHaveBeenCalledWith('/auth/email');
        expect(signInWithEmailLink).toHaveBeenCalledWith('secret');
        session.next('/account/orders/17');
        expect(navigate).toHaveBeenCalledWith('/account/orders/17', { replaceUrl: true });
    });

    it('shows a readable failure for an expired or already used link', () => {
        const fixture = TestBed.createComponent(EmailLoginComponent);
        session.error(new Error('EXPIRED'));
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Ссылка недействительна');
        expect(navigate).not.toHaveBeenCalled();
        const loginButton: HTMLButtonElement = fixture.nativeElement.querySelector('button');

        expect(loginButton.textContent).toContain('Получить ссылку входа');
        loginButton.click();

        expect(openCustomDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { emailLogin: true } }));
    });

    it('requests another confirmation through registration after an expired link', async () => {
        navigate.mockRestore();

        const harness = await RouterTestingHarness.create('/auth/email#token=secret');

        session.error(new Error('EXPIRED'));
        await harness.fixture.whenStable();
        harness.detectChanges();

        const registrationLink = harness.routeNativeElement.querySelector<HTMLAnchorElement>('a[href="/auth/registration"]');

        expect(harness.routeNativeElement.textContent).toContain('отправим новое письмо подтверждения');
        registrationLink.click();
        await harness.fixture.whenStable();
        harness.detectChanges();

        expect(TestBed.inject(Router).url).toBe('/auth/registration');

        const inputs = [
            ['input[autocomplete="username"]', 'pending@example.com'],
            ['amstore-input-signal[label="Пароль"] input', 'Password123!'],
            ['amstore-input-signal[label="Повторите пароль"] input', 'Password123!'],
        ];

        for (const [selector, value] of inputs) {
            const input = harness.routeNativeElement.querySelector<HTMLInputElement>(selector);

            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            harness.detectChanges();
        }

        harness.routeNativeElement.querySelector<HTMLInputElement>('input[type="checkbox"]').click();
        await harness.fixture.whenStable();
        harness.detectChanges();
        harness.routeNativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await harness.fixture.whenStable();

        expect(createUser).toHaveBeenCalledWith({
            email: 'pending@example.com',
            password: 'Password123!',
        });
        expect(openCustomDialog).not.toHaveBeenCalled();
    });

    it('does not attempt to authenticate when the URL has no token', () => {
        route.snapshot.fragment = null;
        const fixture = TestBed.createComponent(EmailLoginComponent);
        expect(fixture.componentInstance.failed()).toBe(true);
        expect(signInWithEmailLink).not.toHaveBeenCalled();
    });
});
