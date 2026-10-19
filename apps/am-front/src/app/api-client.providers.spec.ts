import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminOrdersService } from '@am-front/services/admin-orders.service';
import { provideApiClient } from './api-client.providers';


describe('API client response handling', () => {
    let http: HttpTestingController;
    let orders: AdminOrdersService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideApiClient(),
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        http = TestBed.inject(HttpTestingController);
        orders = TestBed.inject(AdminOrdersService);
    });

    afterEach(() => http.verify());

    it.each(['application/octet-stream', 'application/pdf'])('preserves a downloaded %s Blob', (type) => {
        const next = jest.fn();
        const error = jest.fn();
        const blob = new Blob(['file contents'], { type });

        orders.downloadOrderFile(42, 13).subscribe({ next, error });
        const request = http.expectOne('/api/admin/cart/42/download/13');
        expect(request.request.responseType).toBe('blob');
        request.flush(blob);

        expect(error).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0]).toBe(blob);
    });

    it('continues converting nested JSON dates', () => {
        const next = jest.fn();
        const createdAt = '2026-10-18T09:30:00.000Z';

        orders.getOrder(42).subscribe(next);
        const request = http.expectOne('/api/admin/cart/42');
        expect(request.request.responseType).toBe('json');
        request.flush({
            id: 42,
            createdAt,
            patterns: [{ id: 31, createdAt, name: 'Волны' }],
        });

        expect(next).toHaveBeenCalledWith({
            id: 42,
            createdAt: new Date(createdAt),
            patterns: [{ id: 31, createdAt: new Date(createdAt), name: 'Волны' }],
        });
    });
});
