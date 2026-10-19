import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormGroup } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DialogService } from '@am-front/core/dialog/dialog.service';
import { ApiFilesProducer, FullPatternSizeDto } from '@am-front/root/api-v2';
import { SizesService } from '@am-front/services/sizes.service';
import { AmstorePatternSizesComponent } from './pattern-sizes.component';

describe('Pattern size files form', () => {
    let fixture: ComponentFixture<AmstorePatternSizesComponent>;
    let component: AmstorePatternSizesComponent;
    let form: FormArray;
    const files = {
        cbb: { id: 11, name: 'pattern.cbb' },
        png: { id: 14, name: 'pattern.png' },
        pdf: { id: 13, name: 'pattern.pdf' },
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AmstorePatternSizesComponent],
            providers: [
                provideNoopAnimations(),
                { provide: SizesService, useValue: { sizesList: signal([{ value: 3, label: '36' }]) } },
                { provide: DialogService, useValue: {} },
                { provide: ApiFilesProducer, useValue: {} },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(AmstorePatternSizesComponent);
        component = fixture.componentInstance;
        form = new FormArray([]);
        fixture.componentRef.setInput('formArray', form);
        fixture.detectChanges();
    });

    it('requires only CBB, PNG and PDF uploads to create a valid size', () => {
        (fixture.nativeElement.querySelector('amstore-button') as HTMLElement).click();
        expect(form.invalid).toBe(true);
        form.at(0).patchValue({ size: 3, ...files });
        fixture.detectChanges();

        expect(form.valid).toBe(true);
        expect(Object.keys((form.at(0) as FormGroup).controls)).toEqual(['id', 'size', 'cbb', 'png', 'pdf']);
        expect(form.getRawValue()).toEqual([{ id: null, size: 3, ...files }]);
        const inputs = Array.from(fixture.nativeElement.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
        expect(inputs.map((input) => input.accept)).toEqual(['.cbb', '.png', '.pdf']);
    });

    it.each(['cbb', 'png', 'pdf'])('keeps %s required', (format) => {
        component.addSize();
        form.at(0).patchValue({ size: 3, ...files });
        form.at(0).get(format).setValue(null);

        expect(form.invalid).toBe(true);
        expect(form.at(0).get(format).hasError('required')).toBe(true);
    });

    it('loads an existing size and preserves its file IDs', () => {
        const size: FullPatternSizeDto = {
            id: 21, size: { id: 3, value: 36 }, cbb: 11, png: 14, pdf: 13,
        };
        component.setSizes([size]);
        fixture.detectChanges();

        expect(form.valid).toBe(true);
        expect(form.getRawValue()).toEqual([{ id: 21, size: 3, cbb: 11, png: 14, pdf: 13 }]);
        expect(form.at(0).get('size').disabled).toBe(true);
    });
});
