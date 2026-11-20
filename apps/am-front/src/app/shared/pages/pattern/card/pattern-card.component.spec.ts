import { Component, input, type InputSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { AccountRoutes } from '@am-front/root/features/main/account/account.routes';
import { StoreRoutes } from '@am-front/root/features/main/store/store.routes';
import type { FullPatternEntityDto } from '@am-front/root/api-v2';
import { CategoriesService } from '@am-front/services/categories.service';
import { PatternsService } from '@am-front/services/patterns.service';
import { ProfileService } from '@am-front/services/profile.service';
import { AuthService } from '@am-front/services/auth.service';
import { PatternCartComponent } from '@am-front/shared/actions/pattern/pattern-cart/pattern-cart.component';
import { AmstoreViewerService } from '@am-front/shared/viewer/viewer.service';
import { PatternCardComponent } from './pattern-card.component';


@Component({
    selector: 'amstore-pattern-cart',
    template: '',
})
class PatternCartStub {
    public readonly pattern: InputSignal<FullPatternEntityDto> = input.required();
}

describe('pattern card routes', () => {
    const isAdmin = signal(false);

    const pattern = {
        id: 7,
        name: { ru: 'Волны', en: 'Waves' },
        description: { ru: 'Морская схема' },
        basePrice: { ru: 100 },
        additionalPrice: { ru: 10 },
        colorPrice: { ru: 20 },
        hidden: false,
        categories: [],
        images: [],
        sizes: [],
        color: { id: 30, name: 'Подбор', path: '' },
    } satisfies FullPatternEntityDto;

    const getPattern = jest.fn(() => of(pattern));

    beforeEach(() => {
        isAdmin.set(false);
        getPattern.mockClear();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    {
                        path: 'account',
                        children: AccountRoutes,
                    },
                    {
                        path: '',
                        children: StoreRoutes,
                    },
                ]),
                provideNoopAnimations(),
                { provide: PatternsService, useValue: { getPattern, downloadPurchasedFile: jest.fn() } },
                { provide: ProfileService, useValue: { isAdmin, boughtPatterns: signal([]) } },
                { provide: AuthService, useValue: { auth: signal(true), token: signal('test-token') } },
                { provide: CategoriesService, useValue: { categoriesById: signal({}) } },
                { provide: AmstoreViewerService, useValue: {} },
            ],
        }).overrideComponent(PatternCardComponent, {
            remove: { imports: [PatternCartComponent] },
            add: { imports: [PatternCartStub] },
        });
    });

    it.each([false, true])('opens purchased details without catalogue actions for admin=%s', async (administrator: boolean) => {
        isAdmin.set(administrator);

        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl('/account/patterns/7', PatternCardComponent);
        expect(getPattern).toHaveBeenCalledWith(7);
        expect(harness.routeNativeElement?.textContent).toContain('Волны');
        expect(harness.routeNativeElement?.querySelector('amstore-pattern-common')).not.toBeNull();
        expect(harness.routeNativeElement?.querySelector('amstore-pattern-purchased-download')).not.toBeNull();
        expect(harness.routeNativeElement?.querySelector('amstore-pattern-buy-other-sizes')).not.toBeNull();
        expect(harness.routeNativeElement?.querySelector('amstore-pattern-cart')).toBeNull();
        expect(harness.routeNativeElement?.textContent).not.toContain('Изменить');
    });

    it('retains catalogue actions when navigating from purchased details to the store', async () => {
        isAdmin.set(true);

        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl('/account/patterns/7', PatternCardComponent);
        await harness.navigateByUrl('/patterns/7', PatternCardComponent);
        expect(harness.routeNativeElement?.querySelector('amstore-pattern-cart')).not.toBeNull();
        expect(harness.routeNativeElement?.querySelector('amstore-pattern-purchased-download')).toBeNull();
        expect(harness.routeNativeElement?.querySelector('amstore-pattern-buy-other-sizes')).toBeNull();
        expect(harness.routeNativeElement?.textContent).toContain('Изменить');
    });
});
