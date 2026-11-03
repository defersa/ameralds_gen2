import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, type Observable } from 'rxjs';
import { ApiAppSettingsProducer, type AppSettingsHistoryDto, type AppSettingsVersionDto } from '../api-v2';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';
import { AppSettingsService, type AppSettingsPageData } from './app-settings.service';

describe('AppSettings frontend access checks', () => {
    const authenticated = signal(true);
    const admin = signal(true);
    const api = { appSettingsControllerCurrent: jest.fn(), appSettingsControllerHistory: jest.fn(), appSettingsControllerCreate: jest.fn() };
    beforeEach(() => {
        authenticated.set(true);
        admin.set(true);
        jest.clearAllMocks();
        Object.values(api).forEach(method => method.mockReturnValue(of({})));
        TestBed.configureTestingModule({ providers: [
            { provide: AuthService, useValue: { auth: authenticated } },
            { provide: ProfileService, useValue: { isAdmin: admin } },
            { provide: ApiAppSettingsProducer, useValue: api },
        ] });
    });

    it.each([[false, true], [true, false], [false, false]])('does not request settings for auth=%s admin=%s', (auth, isAdmin) => {
        const service = TestBed.inject(AppSettingsService);
        const requests: Observable<unknown>[] = [service.current(), service.history(1), service.loadPage(1), service.create({ expectedVersion: 1, changes: { orders: { paymentExpirationDays: 14 } } })];
        authenticated.set(auth);
        admin.set(isAdmin);
        requests.forEach(request => request.subscribe({ next: () => { throw new Error('Access should be denied'); }, error: error => expect(error.status).toBe(403) }));
        Object.values(api).forEach(method => expect(method).not.toHaveBeenCalled());
    });

    it('uses the generated client for authorized requests', () => {
        const service = TestBed.inject(AppSettingsService);
        service.current().subscribe();
        service.history(2).subscribe();
        expect(api.appSettingsControllerCurrent).toHaveBeenCalledTimes(1);
        expect(api.appSettingsControllerHistory).toHaveBeenCalledWith(2);
    });

    it('returns a page only after both current settings and history have been loaded', () => {
        const current = new Subject<AppSettingsVersionDto>();
        const history = new Subject<AppSettingsHistoryDto>();
        const version = {
            version: 2, createdAt: new Date('2026-11-01T10:00:00Z'), createdBy: null,
            snapshot: {}, effective: { orders: { paymentExpirationDays: 7 } },
        } satisfies AppSettingsVersionDto;
        const page = { page: 2, count: 2, total: 12, activeVersion: 2, items: [] } satisfies AppSettingsHistoryDto;
        api.appSettingsControllerCurrent.mockReturnValue(current);
        api.appSettingsControllerHistory.mockReturnValue(history);
        const received: AppSettingsPageData[] = [];
        TestBed.inject(AppSettingsService).loadPage(2).subscribe(result => received.push(result));
        expect(api.appSettingsControllerCurrent).toHaveBeenCalledTimes(1);
        expect(api.appSettingsControllerHistory).toHaveBeenCalledWith(2);
        current.next(version);
        current.complete();
        expect(received).toEqual([]);
        history.next(page);
        history.complete();
        expect(received).toEqual([{ current: version, history: page }]);
    });
});
