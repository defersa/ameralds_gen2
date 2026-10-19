import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminOrderDetailsPatternDto, downloadFile } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { SnackService } from '@am-front/services/snackbar.service';
import { AuthInterceptor } from '../../../auth.interceptor';
import { provideApiClient } from '../../../api-client.providers';
import { DownloadInterceptor } from '../../../download.interceptor';
import { PatternAdminDownloadComponent } from './pattern-admin-download.component';


jest.mock('../../../api-v2/utils/file-download', () => ({ downloadFile: jest.fn() }));

describe('PatternAdminDownloadComponent', () => {
    let fixture: ComponentFixture<PatternAdminDownloadComponent>;
    let component: PatternAdminDownloadComponent;
    let http: HttpTestingController;
    let item: AdminOrderDetailsPatternDto;
    const auth = signal(true);
    const isAdmin = signal(true);
    const warn = jest.fn();

    beforeEach(async () => {
        jest.clearAllMocks();
        auth.set(true);
        isAdmin.set(true);
        item = {
            id: 31,
            sizes: [
                { id: 21, size: { id: 3, value: 36 } },
                { id: 23, size: { id: 6, value: 44 } },
            ],
            pattern: {
                id: 7,
                name: { ru: 'Волны', en: 'Waves' },
                sizes: [
                    { id: 21, size: { id: 3, value: 36 }, cbb: 11, pdf: 13, png: 14 },
                    { id: 22, size: { id: 5, value: 40 }, cbb: 15, pdf: 16, png: 19 },
                    { id: 23, size: { id: 6, value: 44 }, cbb: null, pdf: 17, png: 21 },
                ],
            },
        } as AdminOrderDetailsPatternDto;

        await TestBed.configureTestingModule({
            imports: [PatternAdminDownloadComponent],
            providers: [
                provideApiClient(),
                provideHttpClient(
                    withInterceptors([AuthInterceptor, DownloadInterceptor]),
                    withInterceptorsFromDi(),
                ),
                provideHttpClientTesting(),
                { provide: AuthService, useValue: { auth, token: signal('test-access-token') } },
                { provide: ProfileService, useValue: { isAdmin } },
                { provide: SnackService, useValue: { warn } },
            ],
        }).compileComponents();
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(PatternAdminDownloadComponent);
        fixture.componentRef.setInput('orderId', 42);
        fixture.componentRef.setInput('orderPattern', item);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => http.verify());

    function links(): HTMLAnchorElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll('a'));
    }

    it('links only CBB/PDF files of sizes selected in the order', () => {
        expect(links().map((link) => [link.textContent.trim(), link.getAttribute('href')])).toEqual([
            ['CBB', '/api/admin/cart/42/download/11'],
            ['PDF', '/api/admin/cart/42/download/13'],
            ['PDF', '/api/admin/cart/42/download/17'],
        ]);
        expect(fixture.nativeElement.textContent).toContain('36 бвк');
        expect(fixture.nativeElement.textContent).toContain('44 бвк');
        expect(fixture.nativeElement.textContent).not.toContain('40 бвк');
        expect(fixture.nativeElement.textContent).not.toContain('PNG');
    });

    it.each([
        [0, 11, 'cbb'],
        [1, 13, 'pdf'],
    ])('downloads link %s through the authenticated endpoint', (index: number, fileId: number, format: string) => {
        links()[index].click();

        const request = http.expectOne(`/api/admin/cart/42/download/${fileId}`);
        expect(request.request.method).toBe('GET');
        expect(request.request.responseType).toBe('blob');
        expect(request.request.headers.get('Authorization')).toBe('Bearer test-access-token');
        const blob = new Blob(['file contents']);
        request.flush(blob);

        expect(downloadFile).toHaveBeenCalledWith(blob, `Волны - 36 бвк.${format}`);
        expect(component.downloading().size).toBe(0);
    });

    it('prevents duplicate downloads while the file is loading', () => {
        const link = links()[0];
        link.click();
        fixture.detectChanges();
        link.click();

        expect(link.getAttribute('aria-disabled')).toBe('true');
        expect(link.getAttribute('aria-busy')).toBe('true');
        http.expectOne('/api/admin/cart/42/download/11').flush(new Blob(['contents']));
        fixture.detectChanges();

        expect(link.hasAttribute('aria-disabled')).toBe(false);
        expect(link.getAttribute('aria-busy')).toBe('false');
    });

    it('reports a failed download and allows retrying', () => {
        links()[0].click();
        http.expectOne('/api/admin/cart/42/download/11')
            .flush(new Blob(), { status: 400, statusText: 'Bad Request' });

        expect(warn).toHaveBeenCalledWith('Не удалось скачать файл. Попробуйте ещё раз');
        expect(downloadFile).not.toHaveBeenCalled();
        expect(component.downloading().size).toBe(0);

        links()[0].click();
        http.expectOne('/api/admin/cart/42/download/11').flush(new Blob(['contents']));
        expect(downloadFile).toHaveBeenCalledTimes(1);
    });

    it.each([[false, false], [false, true], [true, false]])(
        'hides links and makes no request when auth=%s and admin=%s',
        (authenticated, administrator) => {
            auth.set(authenticated);
            isAdmin.set(administrator);
            fixture.detectChanges();
            component.download(new Event('click', { cancelable: true }), 13);

            expect(links()).toEqual([]);
            http.expectNone((request) => request.url.includes('/download/'));
        },
    );

    it.each([12, 14, 15, 16, 999])('does not request unlisted file %s', (fileId) => {
        component.download(new Event('click', { cancelable: true }), fileId);

        http.expectNone((request) => request.url.includes('/download/'));
        expect(downloadFile).not.toHaveBeenCalled();
    });

    it('shows unavailable files when a selected size is no longer in the pattern', () => {
        fixture.componentRef.setInput('orderPattern', {
            ...item,
            sizes: [{ id: 99, size: { id: 8, value: 48 } }],
        });
        fixture.detectChanges();

        expect(links()).toEqual([]);
        expect(fixture.nativeElement.textContent).toContain('48 бвк');
        expect(fixture.nativeElement.textContent).toContain('Файлы недоступны');
    });

    it('handles an order item without selected sizes', () => {
        fixture.componentRef.setInput('orderPattern', { ...item, sizes: [] });
        fixture.detectChanges();

        expect(links()).toEqual([]);
        expect(fixture.nativeElement.textContent).toContain('В заказе нет выбранных размеров.');
    });

    it('cancels the active download when the component is destroyed', () => {
        links()[0].click();
        const request = http.expectOne('/api/admin/cart/42/download/11');
        fixture.destroy();

        expect(request.cancelled).toBe(true);
        expect(downloadFile).not.toHaveBeenCalled();
    });
});
