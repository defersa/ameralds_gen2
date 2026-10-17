import { Component, LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { disabled, form, FormField, maxDate, minDate, readonly, required } from '@angular/forms/signals';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatCalendarHarness } from '@angular/material/datepicker/testing';
import { MatDatepickerInput } from '@angular/material/datepicker';
import { AmstoreDatepickerSignalComponent } from './datepicker.component';


@Component({
    imports: [AmstoreDatepickerSignalComponent, FormField],
    template: '<amstore-datepicker-signal [formField]="dateForm.date" label="Дата заказа" hint="Выберите дату"/>',
})
class DatepickerTestHost {
    public readonly model = signal<{ date: Date | null }>({ date: null });
    public readonly isDisabled = signal(false);
    public readonly isReadonly = signal(false);
    public readonly dateForm = form(this.model, (path) => {
        required(path.date);
        minDate(path.date, new Date(2026, 9, 10), { message: 'Слишком ранняя дата' });
        maxDate(path.date, new Date(2026, 9, 20), { message: 'Слишком поздняя дата' });
        disabled(path.date, () => this.isDisabled());
        readonly(path.date, () => this.isReadonly());
    });
}

describe('AmstoreDatepickerSignalComponent', () => {
    let fixture: ComponentFixture<DatepickerTestHost>;
    let host: DatepickerTestHost;
    let input: HTMLInputElement;
    let button: HTMLButtonElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DatepickerTestHost],
            providers: [
                provideNoopAnimations(),
                { provide: LOCALE_ID, useValue: 'ru-RU' },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(DatepickerTestHost);
        host = fixture.componentInstance;
        fixture.detectChanges();
        input = fixture.nativeElement.querySelector('input');
        button = fixture.nativeElement.querySelector('button');
    });

    function enterDate(text: string): void {
        input.value = text;
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('change'));
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();
    }

    it('writes a localized date to the signal form and marks the field dirty and touched', () => {
        expect(input.required).toBe(true);
        expect(fixture.nativeElement.querySelector('label').htmlFor).toBe(input.id);

        enterDate('16.10.2026');

        expect(host.model().date).toEqual(new Date(2026, 9, 16));
        expect(host.dateForm.date().dirty()).toBe(true);
        expect(host.dateForm.date().touched()).toBe(true);
        expect(host.dateForm.date().valid()).toBe(true);
    });

    it('reports an impossible date as a parse error and restores the display on reset', () => {
        host.model.set({ date: new Date(2026, 9, 15) });
        fixture.detectChanges();

        enterDate('31.02.2026');

        expect(host.model().date).toEqual(new Date(2026, 9, 15));
        expect(host.dateForm.date().errors()).toEqual(expect.arrayContaining([
            expect.objectContaining({ kind: 'parse' }),
        ]));
        expect(input.value).toBe('31.02.2026');
        expect(input.getAttribute('aria-invalid')).toBe('true');

        host.dateForm.date().reset();
        fixture.detectChanges();

        expect(host.dateForm.date().errors()).toEqual([]);
        expect(input.value).toBe('15.10.2026');
    });

    it('clears the value and displays the required error after the input is emptied', () => {
        enterDate('16.10.2026');
        enterDate('');

        expect(host.model().date).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Это поле обязательно');
    });

    it('uses schema date bounds in the calendar and displays schema errors for typed dates', () => {
        const datepickerInput = fixture.debugElement.query(By.directive(MatDatepickerInput))
            .injector.get(MatDatepickerInput<Date>);

        expect(datepickerInput.min).toEqual(new Date(2026, 9, 10));
        expect(datepickerInput.max).toEqual(new Date(2026, 9, 20));

        enterDate('09.10.2026');
        expect(host.dateForm.date().invalid()).toBe(true);
        expect(fixture.nativeElement.textContent).toContain('Слишком ранняя дата');

        enterDate('21.10.2026');
        expect(fixture.nativeElement.textContent).toContain('Слишком поздняя дата');

        enterDate('16.10.2026');
        expect(host.dateForm.date().valid()).toBe(true);
    });

    it('prevents editing and opening the calendar in disabled and readonly states', () => {
        host.isDisabled.set(true);
        fixture.detectChanges();
        expect(input.disabled).toBe(true);
        expect(button.disabled).toBe(true);

        host.isDisabled.set(false);
        host.isReadonly.set(true);
        fixture.detectChanges();
        expect(input.disabled).toBe(false);
        expect(input.readOnly).toBe(true);
        expect(button.disabled).toBe(true);

        enterDate('16.10.2026');
        expect(host.model().date).toBeNull();
    });

    it('selects a date from the Material calendar and disables days outside the bounds', async () => {
        host.model.set({ date: new Date(2026, 9, 15) });
        fixture.detectChanges();
        button.click();
        fixture.detectChanges();

        const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
        const calendar = await loader.getHarness(MatCalendarHarness);
        const [earlyDate] = await calendar.getCells({ text: '9' });

        expect(await earlyDate.isDisabled()).toBe(true);
        await calendar.selectCell({ text: '16' });

        expect(host.model().date).toEqual(new Date(2026, 9, 16));
        expect(host.dateForm.date().dirty()).toBe(true);
    });
});
