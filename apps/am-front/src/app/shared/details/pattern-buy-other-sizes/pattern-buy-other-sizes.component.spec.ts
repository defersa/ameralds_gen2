import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import type { FullPatternEntityDto, UserProfilePatternDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { PatternBuyOtherSizesComponent } from './pattern-buy-other-sizes.component';


describe('buy other pattern sizes', () => {
    let fixture: ComponentFixture<PatternBuyOtherSizesComponent>;
    const auth = signal(true);
    const boughtPatterns = signal<UserProfilePatternDto[]>([]);

    const pattern = {
        id: 7,
        name: { ru: 'Волны' },
        description: { ru: 'Морская схема' },
        basePrice: { ru: 100 },
        additionalPrice: { ru: 10 },
        colorPrice: { ru: 20 },
        hidden: false,
        categories: [],
        images: [],
        color: null,
        sizes: [
            { id: 21, size: { id: 3, value: 36 }, cbb: 11, pdf: 12, png: 13 },
            { id: 22, size: { id: 5, value: 40 }, cbb: 14, pdf: 15, png: 16 },
        ],
    } satisfies FullPatternEntityDto;

    const purchase = {
        id: 101,
        pattern: { id: 7 },
        color: false,
        sizes: [{ id: 21, size: { id: 3, value: 36 } }],
    } satisfies UserProfilePatternDto;

    beforeEach(() => {
        auth.set(true);
        boughtPatterns.set([purchase]);
        TestBed.configureTestingModule({
            imports: [PatternBuyOtherSizesComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { auth } },
                { provide: ProfileService, useValue: { boughtPatterns } },
            ],
        });
        fixture = TestBed.createComponent(PatternBuyOtherSizesComponent);
        fixture.componentRef.setInput('pattern', pattern);
        fixture.detectChanges();
    });

    it('links to the store card when at least one size has not been purchased', () => {
        const button = fixture.debugElement.query(By.directive(RouterLink));

        expect(button.nativeElement.textContent).toContain('Купить другие размеры');
        expect(button.injector.get(RouterLink).urlTree?.toString()).toBe('/patterns/7');
    });

    it('hides the button after all sizes are purchased, even without a purchased color', () => {
        boughtPatterns.set([{
            ...purchase,
            sizes: [
                ...purchase.sizes,
                { id: 22, size: { id: 5, value: 40 } },
            ],
        }]);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('amstore-button')).toBeNull();
    });

    it('combines sizes from different purchases of the same pattern', () => {
        boughtPatterns.set([
            purchase,
            { ...purchase, id: 102, sizes: [{ id: 22, size: { id: 5, value: 40 } }] },
        ]);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('amstore-button')).toBeNull();
    });

    it('ignores sizes of other patterns and does not compare size counts', () => {
        boughtPatterns.set([
            purchase,
            { ...purchase, id: 102, pattern: { id: 8 }, sizes: [{ id: 22, size: { id: 5, value: 40 } }] },
            { ...purchase, id: 103, sizes: [{ id: 99, size: { id: 9, value: 48 } }] },
        ]);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Купить другие размеры');
    });

    it('hides the button after logout and until ownership is loaded', () => {
        auth.set(false);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('amstore-button')).toBeNull();
        auth.set(true);
        boughtPatterns.set([]);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('amstore-button')).toBeNull();
        boughtPatterns.set([purchase]);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Купить другие размеры');
    });

    it('allows buying a size when only color ownership remains', () => {
        boughtPatterns.set([{ ...purchase, color: true, sizes: [] }]);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Купить другие размеры');
    });

    it('does not offer removed size definitions or a pattern without sizes', () => {
        fixture.componentRef.setInput('pattern', {
            ...pattern,
            sizes: [pattern.sizes[0], { ...pattern.sizes[1], size: null }],
        });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('amstore-button')).toBeNull();
        fixture.componentRef.setInput('pattern', { ...pattern, sizes: [] });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('amstore-button')).toBeNull();
    });
});
