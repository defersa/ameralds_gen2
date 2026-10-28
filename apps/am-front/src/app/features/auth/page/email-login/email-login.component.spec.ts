import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '@am-front/services/auth.service';
import { DialogService } from '@am-front/core/dialog/dialog.service';
import { EmailLoginComponent } from './email-login.component';

describe('email login callback', () => {
    const signInWithEmailLink = jest.fn();
    const replaceState = jest.fn();
    const openCustomDialog = jest.fn();
    let session: Subject<string>;
    let route: { snapshot: { fragment: string | null } };
    let navigate: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        session = new Subject();
        signInWithEmailLink.mockReturnValue(session);
        route = { snapshot: { fragment: 'token=secret' } };
        TestBed.configureTestingModule({ imports: [EmailLoginComponent], providers: [
            provideRouter([]), { provide: ActivatedRoute, useValue: route }, { provide: Location, useValue: { replaceState } },
            { provide: AuthService, useValue: { signInWithEmailLink } }, { provide: DialogService, useValue: { openCustomDialog } },
        ] });
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
        fixture.componentInstance.requestAnotherLink();
        expect(openCustomDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { emailLogin: true } }));
    });

    it('does not attempt to authenticate when the URL has no token', () => {
        route.snapshot.fragment = null;
        const fixture = TestBed.createComponent(EmailLoginComponent);
        expect(fixture.componentInstance.failed()).toBe(true);
        expect(signInWithEmailLink).not.toHaveBeenCalled();
    });
});
