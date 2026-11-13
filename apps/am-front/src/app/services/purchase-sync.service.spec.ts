import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { UserCartService } from './cart/sources/user-cart.service';
import { ProfileService } from './profile.service';
import { PurchaseSyncService } from './purchase-sync.service';


describe('purchase synchronization across tabs', () => {
    const auth = signal(true);
    const refreshCart = jest.fn();
    const loadProfile = jest.fn();

    const session = {
        auth,
        sessionRevision: 0,
    };

    let service: PurchaseSyncService;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        auth.set(true);
        session.sessionRevision = 0;
        refreshCart.mockReturnValue(of({}));
        loadProfile.mockReturnValue(of(null));
        TestBed.configureTestingModule({ providers: [
            {
                provide: AuthService,
                useValue: session,
            },
            {
                provide: UserCartService,
                useValue: { refreshCart },
            },
            {
                provide: ProfileService,
                useValue: { loadProfile },
            },
        ] });
        service = TestBed.inject(PurchaseSyncService);
    });

    afterEach(() => {
        TestBed.resetTestingModule();
        jest.restoreAllMocks();
        jest.useRealTimers();
        localStorage.clear();
    });

    it('refreshes server state on confirmation and notifies other tabs without sharing purchase details', () => {
        service.purchaseConfirmed();
        expect(refreshCart).toHaveBeenCalledTimes(1);
        expect(loadProfile).toHaveBeenCalledWith(true);
        expect(localStorage.getItem('amstore:purchase-updated')).toMatch(/^[a-f0-9-]{36}$/);
    });

    it('does not poll in an open tab without purchase or foreground events', () => {
        jest.advanceTimersByTime(3_600_000);
        expect(refreshCart).not.toHaveBeenCalled();
        expect(loadProfile).not.toHaveBeenCalled();
    });

    it('refreshes on a purchase event even when the current data was just refreshed', () => {
        service.purchaseConfirmed();
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'amstore:purchase-updated',
            newValue: 'untrusted',
        }));
        expect(refreshCart).toHaveBeenCalledTimes(2);
        expect(refreshCart).toHaveBeenLastCalledWith();
        expect(loadProfile).toHaveBeenLastCalledWith(true);
    });

    it('ignores unrelated storage events', () => {
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'unrelated',
            newValue: 'untrusted',
        }));
        expect(refreshCart).not.toHaveBeenCalled();
        expect(loadProfile).not.toHaveBeenCalled();
    });

    it('combines foreground events and refreshes again only after the data becomes stale', () => {
        window.dispatchEvent(new Event('focus'));
        document.dispatchEvent(new Event('visibilitychange'));
        expect(refreshCart).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(29_999);
        window.dispatchEvent(new Event('focus'));
        expect(refreshCart).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(1);
        expect(refreshCart).toHaveBeenCalledTimes(1);
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
        expect(refreshCart).toHaveBeenCalledTimes(2);
        expect(loadProfile).toHaveBeenCalledTimes(2);
    });

    it('does not suppress a refresh for a new session because the previous session was just refreshed', () => {
        window.dispatchEvent(new Event('focus'));
        session.sessionRevision++;
        window.dispatchEvent(new Event('focus'));
        expect(refreshCart).toHaveBeenCalledTimes(2);
    });

    it('keeps a purchase event received in a hidden tab until it becomes visible', () => {
        service.purchaseConfirmed();

        const visibility = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

        window.dispatchEvent(new StorageEvent('storage', {
            key: 'amstore:purchase-updated',
        }));
        document.dispatchEvent(new Event('visibilitychange'));
        expect(refreshCart).toHaveBeenCalledTimes(1);
        visibility.mockReturnValue('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
        expect(refreshCart).toHaveBeenCalledTimes(2);
        expect(loadProfile).toHaveBeenCalledTimes(2);
    });

    it('does not load personal data after logout', () => {
        auth.set(false);
        service.purchaseConfirmed();
        window.dispatchEvent(new Event('focus'));
        jest.advanceTimersByTime(60_000);
        expect(refreshCart).not.toHaveBeenCalled();
        expect(loadProfile).not.toHaveBeenCalled();
    });

    it('blocks concurrent foreground refreshes', () => {
        const response = new Subject<unknown>();

        refreshCart.mockReturnValueOnce(response);
        window.dispatchEvent(new Event('focus'));
        document.dispatchEvent(new Event('visibilitychange'));
        expect(refreshCart).toHaveBeenCalledTimes(1);
        response.next({});
        response.complete();
        window.dispatchEvent(new Event('focus'));
        expect(refreshCart).toHaveBeenCalledTimes(1);
    });

    it('rechecks after a purchase event arrives during an older request', () => {
        const response = new Subject<unknown>();

        refreshCart.mockReturnValueOnce(response);
        window.dispatchEvent(new Event('focus'));
        service.purchaseConfirmed();
        expect(refreshCart).toHaveBeenCalledTimes(1);
        response.next({});
        response.complete();
        expect(refreshCart).toHaveBeenCalledTimes(2);
        expect(loadProfile).toHaveBeenCalledTimes(2);
    });

    it('retries a network failure on the next eligible foreground event without a timer', () => {
        refreshCart.mockReturnValueOnce(throwError(() => new Error('Network')));
        window.dispatchEvent(new Event('focus'));
        window.dispatchEvent(new Event('focus'));
        expect(refreshCart).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(30_000);
        expect(refreshCart).toHaveBeenCalledTimes(1);
        window.dispatchEvent(new Event('focus'));
        expect(refreshCart).toHaveBeenCalledTimes(2);
    });

    it('does not process queued notifications after the application is destroyed', () => {
        const response = new Subject<unknown>();

        refreshCart.mockReturnValueOnce(response);
        window.dispatchEvent(new Event('focus'));
        service.purchaseConfirmed();
        TestBed.resetTestingModule();
        response.next({});
        response.complete();
        window.dispatchEvent(new Event('focus'));
        expect(refreshCart).toHaveBeenCalledTimes(1);
    });
});
