import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideApiClient } from '@am-front/root/api-client.providers';
import { EnumUserRole, UserProfileDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { ProfileComponent } from './profile.component';

describe('Profile page', () => {
    const profileUrl = '/api/user/user/profile';
    const user: UserProfileDto = {
        id: 442,
        username: 'Анна',
        email: 'anna@example.com',
        role: EnumUserRole.Common,
        ownPatterns: [],
    };
    const auth = signal(true);
    const token = signal<string | null>('access');
    let fixture: ComponentFixture<ProfileComponent>;
    let http: HttpTestingController;

    beforeEach(async () => {
        auth.set(true);
        token.set('access');
        await TestBed.configureTestingModule({
            imports: [ProfileComponent],
            providers: [
                provideNoopAnimations(),
                provideApiClient(),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: AuthService, useValue: { auth, token } },
            ],
        }).compileComponents();
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    function render(): void {
        fixture = TestBed.createComponent(ProfileComponent);
        fixture.detectChanges();
    }

    function inputs(): HTMLInputElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll('input'));
    }

    it('loads the current profile once and displays its data for reading only', () => {
        render();
        expect(fixture.nativeElement.textContent).toContain('Загрузка профиля');
        const request = http.expectOne(profileUrl);
        expect(request.request.method).toBe('GET');
        request.flush(user);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Пользователь №442');
        expect(inputs().map(input => input.value)).toEqual(['Анна', 'anna@example.com']);
        expect(inputs().every(input => input.readOnly)).toBe(true);
        expect(fixture.nativeElement.textContent).not.toContain('Адрес');

        const buttons = Array.from(fixture.nativeElement.querySelectorAll('amstore-button')) as HTMLElement[];
        expect(buttons).toHaveLength(2);
        for (const button of buttons) {
            expect(button.getAttribute('aria-disabled')).toBe('true');
            button.click();
        }
        http.expectNone(() => true);
    });

    it('allows retrying a failed profile request', () => {
        render();
        http.expectOne(profileUrl).flush(null, { status: 503, statusText: 'Unavailable' });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Не удалось загрузить профиль');

        fixture.nativeElement.querySelector('amstore-button').click();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Загрузка профиля');
        http.expectOne(profileUrl).flush(user);
        fixture.detectChanges();
        expect(inputs()[1].value).toBe(user.email);
    });

    it('updates the displayed data when the existing profile service publishes a profile', () => {
        render();
        http.expectOne(profileUrl).flush(user);
        fixture.detectChanges();

        TestBed.inject(ProfileService).user$.next({ ...user, username: 'Мария', email: 'maria@example.com' });
        fixture.detectChanges();

        expect(inputs().map(input => input.value)).toEqual(['Мария', 'maria@example.com']);
        http.expectNone(() => true);
    });

    it('does not load or display a profile without authorization', () => {
        auth.set(false);
        token.set(null);
        render();

        expect(fixture.nativeElement.querySelector('amstore-profile-card')).toBeNull();
        http.expectNone(() => true);
    });

    it('hides personal data immediately on logout', () => {
        render();
        http.expectOne(profileUrl).flush(user);
        fixture.detectChanges();
        auth.set(false);
        token.set(null);
        fixture.detectChanges();

        expect(inputs()).toEqual([]);
        expect(fixture.nativeElement.textContent).not.toContain(user.email);
        http.expectNone(() => true);
    });
});
