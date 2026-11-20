import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router, RouterLink } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { ApiPatternsProducer, type PatternEntityDto, type PatternsPaginatedPageDto, type SizeDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { CategoriesService } from '@am-front/services/categories.service';
import { MajorCartService } from '@am-front/services/cart/major-cart.service';
import type { CartItemModel } from '@am-front/services/cart/order.misc';
import { SizesService } from '@am-front/services/sizes.service';
import { SnackService } from '@am-front/services/snackbar.service';
import { PatternPreviewActionsComponent } from '@am-front/shared/details/pattern-preview-actions/pattern-preview-actions.component';
import { AmstoreViewerService } from '@am-front/shared/viewer/viewer.service';
import { PatternsComponent } from './patterns.component';


/** Включает автоматическое обновление представления в принятом в проекте Zone.js-окружении тестов. */
async function createPatternsHarness(): Promise<RouterTestingHarness> {
    const harness = await RouterTestingHarness.create();

    harness.fixture.autoDetectChanges();

    return harness;
}

describe('purchased patterns page', () => {
    const authenticated = signal(true);
    const sessionRevision = signal(0);
    const getPurchased = jest.fn();
    const cartById = signal<Record<number, CartItemModel>>({});

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
        sizes: [{ id: 11, size: 1, cbb: 21, pdf: 22, png: 23 }],
        color: { id: 30, name: 'Подбор', path: '' },
    } satisfies PatternEntityDto;

    beforeEach(() => {
        authenticated.set(true);
        sessionRevision.set(0);
        cartById.set({});
        getPurchased.mockReset().mockReturnValue(of({ page: 2, count: 3, items: [pattern] }));
        TestBed.configureTestingModule({
            providers: [
                provideRouter([{ path: 'account/patterns', component: PatternsComponent }]),
                provideNoopAnimations(),
                { provide: AuthService, useValue: { auth: authenticated, sessionRevisionSignal: sessionRevision, get sessionRevision() { return sessionRevision(); } } },
                { provide: ApiPatternsProducer, useValue: { patternsControllerPurchased: getPurchased } },
                { provide: SnackService, useValue: {} },
                { provide: AmstoreViewerService, useValue: {} },
                { provide: CategoriesService, useValue: { categoriesList: signal([]), categoriesById: signal({}) } },
                {
                    provide: SizesService,
                    useValue: {
                        sizes: signal<SizeDto[]>([{ id: 1, value: 36 }]),
                        sizesList: signal([{ value: 1, label: '36' }]),
                    },
                },
                {
                    provide: MajorCartService,
                    useValue: {
                        cartById,
                        boughtPatterns: signal<Record<number, CartItemModel>>({
                            7: { pattern: 7, sizes: [1], color: true, requiresPatternPurchase: false },
                        }),
                    },
                },
            ],
        });
    });

    it('restores catalogue filters from the URL and shows a blue download action for purchases', async () => {
        const harness = await createPatternsHarness();
        const page = await harness.navigateByUrl('/account/patterns?page=2&sizes=1&sizes=2&categories=3&query=волны', PatternsComponent);

        await harness.fixture.whenStable();
        expect(getPurchased).toHaveBeenCalledWith(2, [1, 2], [3], 'волны');
        expect(page.pagesCount()).toBe(3);
        expect(harness.routeNativeElement?.querySelectorAll('amstore-snapshot-pattern')).toHaveLength(1);
        expect(harness.routeNativeElement?.textContent).toContain('Волны');
        expect(harness.routeNativeElement?.textContent).toContain('Скачать');
        expect(harness.routeNativeElement?.textContent).not.toContain('Добавить');

        const preview = harness.routeDebugElement?.query(By.directive(PatternPreviewActionsComponent));
        const link = preview?.query(By.css('amstore-button')).injector.get(RouterLink);

        expect(preview?.query(By.css('amstore-button')).nativeElement.classList.contains('amstore-accent')).toBe(true);
        expect(link?.urlTree?.toString()).toBe('/account/patterns/7');

        const titleLink = harness.routeDebugElement?.query(By.css('amstore-snapshot-pattern h2')).injector.get(RouterLink);

        expect(titleLink?.urlTree?.toString()).toBe('/account/patterns/7');
    });

    it('keeps the download action when the purchased pattern is also in the cart', async () => {
        cartById.set({ 7: { pattern: 7, sizes: [1], color: false, requiresPatternPurchase: false } });

        const harness = await createPatternsHarness();

        await harness.navigateByUrl('/account/patterns', PatternsComponent);
        await harness.fixture.whenStable();
        expect(harness.routeNativeElement?.textContent).toContain('Скачать');
        expect(harness.routeNativeElement?.textContent).not.toContain('Изменить');

        const preview = TestBed.createComponent(PatternPreviewActionsComponent);

        preview.componentRef.setInput('pattern', pattern);
        preview.componentRef.setInput('routerLink', ['/patterns', pattern.id]);
        preview.autoDetectChanges();
        await preview.whenStable();
        expect(preview.nativeElement.textContent).toContain('Изменить');
        cartById.set({});
        await preview.whenStable();
        expect(preview.nativeElement.textContent).toContain('Добавить');
    });

    it('does not request purchases without authentication and clears results on logout', async () => {
        authenticated.set(false);

        const harness = await createPatternsHarness();
        const page = await harness.navigateByUrl('/account/patterns', PatternsComponent);

        await harness.fixture.whenStable();
        expect(getPurchased).not.toHaveBeenCalled();
        authenticated.set(true);
        await harness.fixture.whenStable();
        expect(page.patterns()).toEqual([pattern]);
        authenticated.set(false);
        await harness.fixture.whenStable();
        expect(page.patterns()).toEqual([]);
        expect(harness.routeNativeElement?.querySelector('amstore-snapshot-pattern')).toBeNull();
    });

    it('shows a retry after a failure and prevents duplicate retries while loading', async () => {
        getPurchased.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

        const harness = await createPatternsHarness();
        const page = await harness.navigateByUrl('/account/patterns', PatternsComponent);

        await harness.fixture.whenStable();
        expect(harness.routeNativeElement?.textContent).toContain('Не удалось загрузить');

        const pending = new Subject<PatternsPaginatedPageDto>();

        getPurchased.mockReturnValue(pending);
        page.retry();
        page.retry();
        await harness.fixture.whenStable();
        expect(getPurchased).toHaveBeenCalledTimes(2);
        expect(harness.routeNativeElement?.querySelector('amstore-patterns-skeleton')).not.toBeNull();
        pending.next({ page: 1, count: 0, items: [] });
        await harness.fixture.whenStable();
        expect(harness.routeNativeElement?.textContent).toContain('Купленные схемы не найдены');
    });

    it('cancels stale requests after a URL change and retains selected filters', async () => {
        const pending = new Subject<PatternsPaginatedPageDto>();

        getPurchased.mockReturnValueOnce(pending);

        const harness = await createPatternsHarness();
        const page = await harness.navigateByUrl('/account/patterns?query=волны&categories=3', PatternsComponent);

        await TestBed.inject(Router).navigateByUrl('/account/patterns?query=волны&categories=3&page=2');
        await harness.fixture.whenStable();
        pending.next({ page: 1, count: 1, items: [{ ...pattern, id: 99 }] });
        expect(page.patterns()).toEqual([pattern]);
        expect(getPurchased).toHaveBeenLastCalledWith(2, [], [3], 'волны');
    });

    it('rejects the previous account response and reloads after a session change', async () => {
        const pending = new Subject<PatternsPaginatedPageDto>();

        getPurchased.mockReturnValueOnce(pending);

        const harness = await createPatternsHarness();
        const page = await harness.navigateByUrl('/account/patterns', PatternsComponent);

        sessionRevision.set(1);
        pending.next({ page: 1, count: 1, items: [{ ...pattern, id: 99 }] });
        expect(page.patterns()).toEqual([]);
        await harness.fixture.whenStable();
        expect(getPurchased).toHaveBeenCalledTimes(2);
        expect(page.patterns()).toEqual([pattern]);
    });
});
