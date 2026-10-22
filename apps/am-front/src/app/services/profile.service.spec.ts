import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Subject } from 'rxjs';
import { ApiUserProducer, EnumUserRole, UserProfileDto } from '../api-v2';
import { AdminGuard } from '../core/guards/admin.guard';
import { AuthGuard } from '../core/guards/auth.guard';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';

describe('profile and route access', () => {
    const auth = signal(false);
    const token = signal<string | null>(null);
    let response: Subject<UserProfileDto>;
    let load: jest.Mock;
    let profile: ProfileService;
    const redirect = new UrlTree();
    const user = { id: 1, role: EnumUserRole.Admin, ownPatterns: [] } as UserProfileDto;

    beforeEach(() => {
        auth.set(false);
        token.set(null);
        response = new Subject();
        load = jest.fn(() => response);
        TestBed.configureTestingModule({ providers: [
            { provide: AuthService, useValue: { auth, token } },
            { provide: ApiUserProducer, useValue: { userControllerProfile: load } },
            { provide: HttpClient, useValue: {} },
            { provide: Router, useValue: { parseUrl: () => redirect } },
        ] });
        localStorage.setItem('user_status', 'admin');
        profile = TestBed.inject(ProfileService);
    });

    afterEach(() => localStorage.clear());

    it('does not grant access from a cached browser role', () => {
        expect(profile.isAdmin()).toBe(false);
        expect(TestBed.inject(AuthGuard).canActivate()).toBe(redirect);
        expect(TestBed.inject(AdminGuard).canActivate()).toBe(redirect);
        expect(load).not.toHaveBeenCalled();
    });

    it('waits for the server profile before allowing the administrator route', () => {
        auth.set(true);
        token.set('access');
        const result = jest.fn();
        const guard = TestBed.inject(AdminGuard);
        const activation = guard.canActivate();
        if (activation instanceof UrlTree) throw new Error('Expected an asynchronous profile check');
        activation.subscribe(result);
        expect(result).not.toHaveBeenCalled();
        response.next(user);
        expect(result).toHaveBeenCalledWith(true);
        expect(profile.isAdmin()).toBe(true);
        response.complete();
    });

    it('denies the administrator route for a common user', () => {
        auth.set(true);
        token.set('access');
        const activation = TestBed.inject(AdminGuard).canActivate();
        const result = jest.fn();
        if (activation instanceof UrlTree) throw new Error('Expected a profile check');
        activation.subscribe(result);
        response.next({ ...user, role: EnumUserRole.Common });
        response.complete();
        expect(result).toHaveBeenCalledWith(redirect);
    });

    it('recovers profile loading after a failed request', () => {
        auth.set(true);
        token.set('first');
        TestBed.tick();
        response.error(new Error('Unavailable'));
        expect(profile.user$.value).toBeNull();
        response = new Subject();
        token.set('second');
        TestBed.tick();
        response.next(user);
        expect(load).toHaveBeenCalledTimes(2);
        expect(profile.isAdmin()).toBe(true);
    });

    it('removes administrative access immediately on logout and clears the profile', () => {
        auth.set(true);
        token.set('access');
        TestBed.tick();
        response.next(user);
        expect(profile.isAdmin()).toBe(true);
        auth.set(false);
        token.set(null);
        expect(profile.isAdmin()).toBe(false);
        TestBed.tick();
        expect(profile.user$.value).toBeNull();
        expect(profile.boughtPatterns()).toEqual([]);
    });

    it('ignores an old profile response arriving after the active token has changed', () => {
        auth.set(true);
        token.set('first');
        TestBed.tick();
        token.set('second');
        response.next(user);
        expect(profile.isAdmin()).toBe(false);
        expect(profile.user$.value).toBeNull();
    });
});
