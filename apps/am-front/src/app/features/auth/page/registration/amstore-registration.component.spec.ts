import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { DialogService } from '@am-front/core/dialog/dialog.service';
import { ProfileService } from '@am-front/services/profile.service';
import { SnackService } from '@am-front/services/snackbar.service';
import { AmstoreRegistrationComponent } from './amstore-registration.component';

describe('registration email confirmation', () => {
    let fixture: ComponentFixture<AmstoreRegistrationComponent>;
    let component: AmstoreRegistrationComponent;
    let request: Subject<void>;
    const profile = { createUser: jest.fn() };
    const dialog = { openInfoDialog: jest.fn() };
    const snack = { open: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();
        request = new Subject();
        profile.createUser.mockReturnValue(request);
        await TestBed.configureTestingModule({ imports: [AmstoreRegistrationComponent], providers: [
            provideRouter([]), provideNoopAnimations(), { provide: ProfileService, useValue: profile },
            { provide: DialogService, useValue: dialog }, { provide: SnackService, useValue: snack },
        ] }).compileComponents();
        jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(AmstoreRegistrationComponent);
        component = fixture.componentInstance;
        component.regForm.setValue({ email: 'Buyer@Example.com', password: 'Password123!', passwordRepeat: 'Password123!', firstName: '', lastName: '' });
        component.isAccept.setValue(true);
        fixture.detectChanges();
    });
    afterEach(() => { fixture.destroy(); });

    it('prevents duplicate requests and asks the user to check email without claiming an account was created', async () => {
        component.sendUser();
        component.sendUser();
        expect(profile.createUser).toHaveBeenCalledTimes(1);
        expect(profile.createUser).toHaveBeenCalledWith({ email: 'buyer@example.com', password: 'Password123!' });
        expect(component.pending()).toBe(true);
        request.next();
        request.complete();
        await fixture.whenStable();
        expect(component.pending()).toBe(false);
        expect(dialog.openInfoDialog).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: 'Проверьте почту', smallTitle: 'Запрос принят.' }) }));
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
        expect(dialog.openInfoDialog).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: 'Проверьте почту' }) }));
    });

    it.each([400, 429, 500])('shows a safe message for HTTP %s without displaying account information', status => {
        component.sendUser();
        request.error(new HttpErrorResponse({ status, error: { code: 'ALREADY_EXIST' } }));
        expect(component.pending()).toBe(false);
        expect(snack.open).toHaveBeenCalledWith(status === 429
            ? 'Слишком много попыток. Попробуйте позже'
            : 'Не удалось принять запрос. Проверьте данные и попробуйте позже');
        expect(dialog.openInfoDialog).not.toHaveBeenCalled();
    });

    it('requires valid data and acceptance of registration terms', () => {
        component.isAccept.setValue(false);
        component.sendUser();
        component.isAccept.setValue(true);
        component.regForm.get('email').setValue('invalid');
        component.sendUser();
        expect(profile.createUser).not.toHaveBeenCalled();
    });
});
