import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import type { AppSettingsVersionDto } from '@am-front/root/api-v2';
import { AppSettingsService } from '@am-front/services/app-settings.service';
import { SettingsCreateDialogComponent } from './settings-create-dialog.component';

describe('settings form error messages', () => {
    let fixture: ComponentFixture<SettingsCreateDialogComponent>;
    const create = jest.fn();
    const version = {
        version: 1, createdAt: new Date(), createdBy: null, snapshot: {},
        effective: { orders: { paymentExpirationDays: 7 } },
    } satisfies AppSettingsVersionDto;

    beforeEach(async () => {
        jest.clearAllMocks();
        create.mockReturnValue(of(version));
        await TestBed.configureTestingModule({ imports: [SettingsCreateDialogComponent], providers: [
            provideNoopAnimations(), { provide: MAT_DIALOG_DATA, useValue: version },
            { provide: MatDialogRef, useValue: { close: jest.fn(), disableClose: false } },
            { provide: AppSettingsService, useValue: { create } },
        ] }).compileComponents();
        fixture = TestBed.createComponent(SettingsCreateDialogComponent);
        fixture.detectChanges();
    });
    afterEach(() => fixture.destroy());

    function enterDays(value: string): void {
        const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
        input.value = value;
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();
    }

    it.each([
        ['', 'Это поле обязательно'],
        ['0', 'Значение должно быть не меньше 1'],
        ['-1', 'Значение должно быть не меньше 1'],
        ['366', 'Значение должно быть не больше 365'],
        ['0.5', 'Значение должно быть не меньше 1'],
    ])('renders the shared errors pipe message for %s and prevents saving', (value, message) => {
        enterDays(value);
        fixture.componentInstance.save();
        expect(fixture.nativeElement.querySelector('.amstore-input-signal__message').textContent.trim()).toBe(message);
        expect(fixture.nativeElement.querySelector('input').getAttribute('aria-invalid')).toBe('true');
        expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
        expect(create).not.toHaveBeenCalled();
        expect(fixture.componentInstance.settingsForm.paymentExpirationDays().errors().every(error => error.message === undefined)).toBe(true);
    });

    it.each(['1', '1.5', '7', '365'])('accepts values in the configured range, including fractions and boundaries: %s', value => {
        enterDays('0');
        enterDays(value);
        expect(fixture.nativeElement.querySelector('.is-error')).toBeNull();
        fixture.componentInstance.save();
        expect(create).toHaveBeenCalledWith({ expectedVersion: 1, changes: { orders: { paymentExpirationDays: Number(value) } } });
    });
});
