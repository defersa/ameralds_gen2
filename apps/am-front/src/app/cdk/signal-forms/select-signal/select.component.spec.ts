import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { disabled, form, FormField, readonly, required } from '@angular/forms/signals';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSelectHarness } from '@angular/material/select/testing';
import type { SelectOption } from '@am-front/cdk/forms/forms.abstract.directive';
import { AmstoreSelectSignalComponent } from './select.component';


interface SelectTestModel {
    choice: SelectOption['value'];
    choices: SelectOption['value'][];
}

@Component({
    imports: [AmstoreSelectSignalComponent, FormField],
    template: `
        <amstore-select-signal
            [formField]="selectForm.choice"
            [items]="items()"
            label="Статус"
            hint="Выберите статус"
        />

        <amstore-select-signal
            [formField]="selectForm.choices"
            [items]="items()"
            [multiple]="true"
            label="Несколько статусов"
        />
    `,
})
class SelectTestHost {
    public readonly model = signal<SelectTestModel>({
        choice: null,
        choices: [],
    });

    public readonly items = signal<SelectOption[]>([
        {
            value: null,
            label: 'Без значения',
        },
        {
            value: '',
            label: 'Все статусы',
        },
        {
            value: 0,
            label: 'Ноль',
        },
        {
            value: 1,
            label: 'Число',
        },
        {
            value: '1',
            label: 'Строка',
        },
    ]);

    public readonly isDisabled = signal(false);
    public readonly isReadonly = signal(false);

    public readonly selectForm = form(this.model, path => {
        required(path.choice);
        disabled(path.choice, { when: () => this.isDisabled() });
        readonly(path.choice, { when: () => this.isReadonly() });
    });
}

describe('AmstoreSelectSignalComponent', () => {
    let fixture: ComponentFixture<SelectTestHost>;
    let host: SelectTestHost;
    let single: MatSelectHarness;
    let multiple: MatSelectHarness;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SelectTestHost],
            providers: [provideNoopAnimations()],
        }).compileComponents();

        fixture = TestBed.createComponent(SelectTestHost);
        host = fixture.componentInstance;
        fixture.detectChanges();

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const selects = await loader.getAllHarnesses(MatSelectHarness);

        [single, multiple] = selects;
    });

    it('writes numeric and string options without changing their types and marks the field dirty and touched', async () => {
        await single.clickOptions({ text: 'Ноль' });
        expect(host.model().choice).toBe(0);
        expect(host.selectForm.choice().dirty()).toBe(true);
        expect(host.selectForm.choice().touched()).toBe(true);
        expect(host.selectForm.choice().valid()).toBe(true);
        await single.clickOptions({ text: 'Число' });
        expect(host.model().choice).toBe(1);
        await single.clickOptions({ text: 'Строка' });
        expect(host.model().choice).toBe('1');
    });

    it('renders nullable and empty options and shows standard validation errors, restoring the hint after correction', async () => {
        await single.clickOptions({ text: 'Число' });
        await single.clickOptions({ text: 'Без значения' });
        expect(host.model().choice).toBeNull();
        expect(await single.getValueText()).toBe('Без значения');
        expect(fixture.nativeElement.textContent).toContain('Это поле обязательно');
        expect(fixture.nativeElement.querySelector('mat-select').getAttribute('aria-invalid')).toBe('true');
        await single.clickOptions({ text: 'Все статусы' });
        expect(host.model().choice).toBe('');
        expect(await single.getValueText()).toBe('Все статусы');
        await single.clickOptions({ text: 'Строка' });
        expect(fixture.nativeElement.textContent).not.toContain('Это поле обязательно');
        expect(fixture.nativeElement.textContent).toContain('Выберите статус');
    });

    it('selects several options, preserves their types and removes a deselected item', async () => {
        expect(await multiple.isMultiple()).toBe(true);
        await multiple.clickOptions({ text: 'Число' });
        await multiple.clickOptions({ text: 'Строка' });
        expect(host.model().choices).toEqual([1, '1']);
        await multiple.clickOptions({ text: 'Число' });
        expect(host.model().choices).toEqual(['1']);
    });

    it('blocks opening and changing a disabled or readonly field', async () => {
        host.isDisabled.set(true);
        await fixture.whenStable();
        expect(await single.isDisabled()).toBe(true);
        await single.open();
        expect(await single.isOpen()).toBe(false);
        host.isDisabled.set(false);
        host.isReadonly.set(true);
        await fixture.whenStable();
        await single.open();
        expect(await single.isOpen()).toBe(false);
        expect(host.model().choice).toBeNull();
    });

    it('updates labels for asynchronously supplied items and restores the display on a form reset', async () => {
        await single.clickOptions({ text: 'Число' });
        host.items.set([{
            value: 1,
            label: 'Обновлённый статус',
        }]);
        await fixture.whenStable();
        expect(await single.getValueText()).toBe('Обновлённый статус');
        host.selectForm().reset({
            choice: null,
            choices: [],
        });
        await fixture.whenStable();
        expect(await single.getValueText()).toBe('');
        expect(host.selectForm.choice().dirty()).toBe(false);
        expect(host.selectForm.choice().touched()).toBe(false);
    });

    it('connects the label and hint to the accessible select and can focus it', async () => {
        const element: HTMLElement = fixture.nativeElement.querySelector('mat-select');
        const label: HTMLElement = fixture.nativeElement.querySelector('.amstore-input-signal__label');
        const message: HTMLElement = fixture.nativeElement.querySelector('.amstore-input-signal__message');

        expect(element.getAttribute('aria-labelledby')).toContain(label.id);
        expect(element.getAttribute('aria-describedby')).toContain(message.id);
        fixture.debugElement.query(By.directive(AmstoreSelectSignalComponent)).componentInstance.focus();
        await fixture.whenStable();
        expect(await single.isFocused()).toBe(true);
    });
});
