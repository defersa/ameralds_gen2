import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { downloadFile, type FullPatternEntityDto, type UserProfilePatternDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { PatternsService } from '@am-front/services/patterns.service';
import { SnackService } from '@am-front/services/snackbar.service';
import { AuthInterceptor } from '../../../auth.interceptor';
import { provideApiClient } from '../../../api-client.providers';
import { PatternPurchasedDownloadComponent } from './pattern-purchased-download.component';


jest.mock('../../../api-v2/utils/file-download', () => ({ downloadFile: jest.fn() }));

describe('purchased pattern downloads', () => {
    let fixture: ComponentFixture<PatternPurchasedDownloadComponent>;
    let http: HttpTestingController;
    const auth = signal(true);
    const token = signal<string | null>('test-token');
    const boughtPatterns = signal<UserProfilePatternDto[]>([]);

    const authService = {
        auth,
        token,
        sessionRevision: 0,
    };

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
        color: { id: 30, name: 'Подбор.PDF', path: '' },
        sizes: [
            { id: 21, size: { id: 3, value: 36 }, cbb: 11, pdf: 13, png: 14 },
            { id: 22, size: { id: 5, value: 40 }, cbb: 15, pdf: 16, png: 19 },
        ],
    } satisfies FullPatternEntityDto;

    const purchase = {
        id: 101,
        pattern: { id: 7 },
        sizes: [{ id: 21, size: { id: 3, value: 36 } }],
        color: true,
    } satisfies UserProfilePatternDto;

    beforeEach(async () => {
        jest.clearAllMocks();
        auth.set(true);
        token.set('test-token');
        authService.sessionRevision = 0;
        boughtPatterns.set([purchase]);
        await TestBed.configureTestingModule({
            imports: [PatternPurchasedDownloadComponent],
            providers: [
                provideApiClient(),
                provideHttpClient(withInterceptors([AuthInterceptor]), withInterceptorsFromDi()),
                provideHttpClientTesting(),
                { provide: AuthService, useValue: authService },
                { provide: ProfileService, useValue: { boughtPatterns } },
                { provide: SnackService, useValue: {} },
            ],
        }).compileComponents();
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(PatternPurchasedDownloadComponent);
        fixture.componentRef.setInput('pattern', pattern);
        fixture.detectChanges();
    });

    afterEach(() => http.verify());

    /** Возвращает доступные ссылки, чтобы проверять настоящий HTML и перехват скачивания. */
    function links(): HTMLAnchorElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll('a'));
    }

    it('shows only purchased sizes and color, without links to unpurchased materials', () => {
        expect(links()
            .map((link) => link.getAttribute('href'))).toEqual([
            '/api/patterns/7/download/11',
            '/api/patterns/7/download/13',
            '/api/patterns/7/download/14',
            '/api/patterns/7/download/30',
        ]);
        expect(fixture.nativeElement.textContent).toContain('36 бвк');
        expect(fixture.nativeElement.textContent).not.toContain('40 бвк');
        expect(fixture.nativeElement.textContent).toContain('Подбор цвета куплен');
    });

    it.each([
        [0, 11, 'Волны - 36 бвк.cbb'],
        [1, 13, 'Волны - 36 бвк.pdf'],
        [2, 14, 'Волны - 36 бвк.png'],
        [3, 30, 'Волны - Подбор цвета.PDF'],
    ])('downloads link %s using Bearer authorization and preserves the file format', (index: number, fileId: number, filename: string) => {
        links()[index].click();

        const request = http.expectOne(`/api/patterns/7/download/${fileId}`);
        const blob = new Blob(['contents']);

        expect(request.request.method).toBe('GET');
        expect(request.request.responseType).toBe('blob');
        expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
        request.flush(blob);
        expect(downloadFile).toHaveBeenCalledWith(blob, filename);
    });

    it('prevents repeated downloads while a request is pending', () => {
        const link = links()[0];

        link.click();
        fixture.detectChanges();
        link.click();
        links()[1].click();
        expect(link.getAttribute('aria-disabled')).toBe('true');
        expect(fixture.nativeElement.textContent).toContain('Загрузка файла');
        http.expectOne('/api/patterns/7/download/11').flush(new Blob(['contents']));
        fixture.detectChanges();
        expect(link.hasAttribute('aria-disabled')).toBe(false);
    });

    it('shows a download failure and allows retrying the same link', () => {
        links()[0].click();
        http.expectOne('/api/patterns/7/download/11')
            .flush(new Blob(), { status: 400, statusText: 'Bad Request' });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Не удалось скачать');
        expect(downloadFile).not.toHaveBeenCalled();
        links()[0].click();
        http.expectOne('/api/patterns/7/download/11').flush(new Blob(['contents']));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
        expect(downloadFile).toHaveBeenCalledTimes(1);
    });

    it('hides revoked color but retains purchased size links', () => {
        boughtPatterns.set([{ ...purchase, color: false }]);
        fixture.detectChanges();
        expect(links()).toHaveLength(3);
        expect(fixture.nativeElement.textContent).not.toContain('Подбор цвета куплен');
        fixture.componentInstance.download(new Event('click'), 30);
        http.expectNone('/api/patterns/7/download/30');
    });

    it('retains color ownership but suspends its link without an owned size', () => {
        boughtPatterns.set([{ ...purchase, sizes: [] }]);
        fixture.detectChanges();
        expect(links()).toHaveLength(0);
        expect(fixture.nativeElement.textContent).toContain('Подбор цвета куплен');
        expect(fixture.nativeElement.textContent).toContain('Нет доступных купленных размеров');
        fixture.componentInstance.download(new Event('click'), 30);
        http.expectNone('/api/patterns/7/download/30');
        boughtPatterns.set([purchase]);
        fixture.detectChanges();
        expect(links()).toHaveLength(4);
    });

    it('handles removed sizes and files without exposing unrelated downloads', () => {
        fixture.componentRef.setInput('pattern', { ...pattern, sizes: [], color: null });
        fixture.detectChanges();
        expect(links()).toHaveLength(0);
        expect(fixture.nativeElement.textContent).toContain('36 бвк');
        expect(fixture.nativeElement.textContent).toContain('Файлы недоступны');
    });

    it('unites purchases for the same pattern and ignores purchases of other patterns', () => {
        boughtPatterns.set([
            purchase,
            { ...purchase, id: 102, color: false },
            { ...purchase, id: 103, pattern: { id: 8 }, sizes: [{ id: 22, size: { id: 5, value: 40 } }] },
        ]);
        fixture.detectChanges();
        expect(links()).toHaveLength(4);
        expect(fixture.nativeElement.querySelectorAll('li')).toHaveLength(1);
    });

    it.each([15, 16, 19, 999])('rejects an unpurchased file %s before sending a request', (fileId: number) => {
        fixture.componentInstance.download(new Event('click'), fileId);
        http.expectNone((request) => request.url.includes('/download/'));
    });

    it('hides links after logout and blocks downloads in both the component and service', () => {
        auth.set(false);
        fixture.detectChanges();
        expect(links()).toHaveLength(0);
        fixture.componentInstance.download(new Event('click'), 11);
        TestBed.inject(PatternsService).downloadPurchasedFile(7, 11)
            .subscribe({ error: (error: { status: number }) => expect(error.status).toBe(401) });
        http.expectNone((request) => request.url.includes('/download/'));
    });

    it('does not save a response received after the session changes', () => {
        links()[0].click();

        const request = http.expectOne('/api/patterns/7/download/11');

        token.set('another-account-token');
        authService.sessionRevision++;
        request.flush(new Blob(['contents']));
        expect(downloadFile).not.toHaveBeenCalled();
    });

    it('saves a download when the access token is refreshed within the same session', () => {
        links()[0].click();

        const request = http.expectOne('/api/patterns/7/download/11');
        const blob = new Blob(['contents']);

        token.set('refreshed-access-token');
        request.flush(blob);
        expect(downloadFile).toHaveBeenCalledWith(blob, 'Волны - 36 бвк.cbb');
    });

    it('cancels the download when the component is destroyed', () => {
        links()[0].click();

        const request = http.expectOne('/api/patterns/7/download/11');

        fixture.destroy();
        expect(request.cancelled).toBe(true);
        expect(downloadFile).not.toHaveBeenCalled();
    });
});
