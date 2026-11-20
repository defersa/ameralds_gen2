import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { of } from 'rxjs';
import { CategoriesService } from '@am-front/services/categories.service';
import { PatternsService } from '@am-front/services/patterns.service';
import { AmstoreViewerService } from '@am-front/shared/viewer/viewer.service';
import { AmstorePatternAddCardComponent } from './pattern-add.component';


describe('pattern editor', () => {
    it('preserves existing file IDs and accepts newly uploaded files when saving', () => {
        const editPattern = jest.fn().mockReturnValue(of({}));

        TestBed.configureTestingModule({
            providers: [
                { provide: CategoriesService, useValue: { categoriesList: signal([]) } },
                { provide: PatternsService, useValue: { editPattern, createPattern: jest.fn().mockReturnValue(of({})) } },
                { provide: AmstoreViewerService, useValue: {} },
            ],
        });
        TestBed.overrideComponent(AmstorePatternAddCardComponent, { set: { template: '', imports: [] } });

        const fixture = TestBed.createComponent(AmstorePatternAddCardComponent);
        const component = fixture.componentInstance;

        fixture.componentRef.setInput('data', { id: 7 });
        component.patternForm.patchValue({
            name: { ru: 'Схема', en: 'Pattern' },
            basePrice: { ru: 1, en: 1 },
            additionalPrice: { ru: 1, en: 1 },
            colorPrice: { ru: 1, en: 1 },
            categories: [1],
        });
        component.sizeArrayForm.push(new FormGroup({
            id: new FormControl(21),
            size: new FormControl(3),
            cbb: new FormControl(11),
            png: new FormControl(14),
            pdf: new FormControl(13),
        }));
        component.save();
        expect(editPattern).toHaveBeenCalledWith(7, expect.objectContaining({
            sizes: [{ id: 21, size: 3, cbb: 11, png: 14, pdf: 13 }],
        }));
        component.sizeArrayForm.at(0).patchValue({ pdf: { id: 15, name: 'new.pdf' } });
        component.save();
        expect(editPattern).toHaveBeenLastCalledWith(7, expect.objectContaining({
            sizes: [{ id: 21, size: 3, cbb: 11, png: 14, pdf: 15 }],
        }));
    });
});
