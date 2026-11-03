import { OverlayContainer } from '@angular/cdk/overlay';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import type { AppSettingsVersionDto } from '@am-front/root/api-v2';
import { AppSettingsService, type AppSettingsPageData } from '@am-front/services/app-settings.service';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { SettingsCreateDialogComponent } from './create-dialog/settings-create-dialog.component';
import { SettingsVersionDialogComponent } from './version-dialog/settings-version-dialog.component';
import { SettingsComponent } from './settings.component';

describe('admin settings page dialogs', () => {
    let fixture: ComponentFixture<SettingsComponent>;
    let component: SettingsComponent;
    let dialogs: MatDialog;
    const authenticated = signal(true);
    const admin = signal(true);
    const settings = { loadPage: jest.fn(), create: jest.fn() };
    const version = (value: number, days = 7): AppSettingsVersionDto => ({
        version: value, createdAt: new Date('2026-11-01T10:00:00Z'), createdBy: null,
        snapshot: {}, effective: { orders: { paymentExpirationDays: days } },
    });
    const pageData = (page = 1, currentVersion = 2, days = 7): AppSettingsPageData => ({
        current: version(currentVersion, days),
        history: { page, count: 2, total: 12, activeVersion: currentVersion, items: [version(currentVersion, days), version(1)] },
    });

    beforeEach(async () => {
        authenticated.set(true);
        admin.set(true);
        jest.clearAllMocks();
        settings.loadPage.mockImplementation((page: number) => of(pageData(page)));
        settings.create.mockReturnValue(of(version(3, 14)));
        await TestBed.configureTestingModule({ imports: [SettingsComponent], providers: [
            provideNoopAnimations(), { provide: AppSettingsService, useValue: settings },
            { provide: AuthService, useValue: { auth: authenticated } },
            { provide: ProfileService, useValue: { isAdmin: admin } },
        ] }).compileComponents();
        dialogs = TestBed.inject(MatDialog);
        fixture = TestBed.createComponent(SettingsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    afterEach(() => { fixture.destroy(); dialogs.closeAll(); });

    it('shows server pagination without an inline form', () => {
        expect(settings.loadPage).toHaveBeenCalledWith(1);
        expect(fixture.nativeElement.textContent).toContain('Активная версия 2');
        expect(fixture.nativeElement.querySelector('form')).toBeNull();
        expect(fixture.nativeElement.querySelector('tbody').textContent.match(/Активная/g)).toHaveLength(1);
        component.goToPage(2);
        fixture.detectChanges();
        expect(settings.loadPage).toHaveBeenLastCalledWith(2);
    });

    it('opens a single creation popup prefilled from the active version', () => {
        component.openForm();
        component.openForm();
        fixture.detectChanges();
        expect(dialogs.openDialogs).toHaveLength(1);
        const creation = dialogs.openDialogs[0].componentInstance;
        if (!(creation instanceof SettingsCreateDialogComponent)) throw new Error('Expected creation dialog');
        expect(creation.model().paymentExpirationDays).toBe(7);
        const overlay = TestBed.inject(OverlayContainer).getContainerElement();
        expect(overlay.querySelector('[role="dialog"]')).not.toBeNull();
        expect(overlay.querySelector('input')?.value).toBe('7');
        expect(fixture.nativeElement.querySelector('input')).toBeNull();
    });

    it('updates the page after successful creation closes the popup', async () => {
        component.openForm();
        fixture.detectChanges();
        const creation = dialogs.openDialogs[0].componentInstance;
        if (!(creation instanceof SettingsCreateDialogComponent)) throw new Error('Expected creation dialog');
        creation.model.set({ paymentExpirationDays: 14 });
        settings.loadPage.mockReturnValue(of(pageData(1, 3, 14)));
        creation.save();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(settings.create).toHaveBeenCalledWith({ expectedVersion: 2, changes: { orders: { paymentExpirationDays: 14 } } });
        expect(component.dialogOpen()).toBe(false);
        expect(dialogs.openDialogs).toHaveLength(0);
        expect(fixture.nativeElement.textContent).toContain('Настройки сохранены. Версия 3');
        expect(fixture.nativeElement.textContent).toContain('Активная версия 3');
    });

    it('does not save or reload the list when creation is cancelled', async () => {
        component.openForm();
        fixture.detectChanges();
        const creation = dialogs.openDialogs[0].componentInstance;
        if (!(creation instanceof SettingsCreateDialogComponent)) throw new Error('Expected creation dialog');
        creation.close();
        await fixture.whenStable();
        expect(component.dialogOpen()).toBe(false);
        expect(settings.create).not.toHaveBeenCalled();
        expect(settings.loadPage).toHaveBeenCalledTimes(1);
        expect(component.savedVersion()).toBeNull();
    });

    it('opens a historical version only for reading in a separate popup', () => {
        component.openVersion(version(1));
        fixture.detectChanges();
        expect(dialogs.openDialogs[0].componentInstance).toBeInstanceOf(SettingsVersionDialogComponent);
        const overlay = TestBed.inject(OverlayContainer).getContainerElement();
        expect(overlay.querySelector('h2')?.textContent.trim()).toBe('Версия 1');
        expect(overlay.textContent).toContain('поле отсутствует');
        expect(overlay.querySelector('input')).toBeNull();
        expect(overlay.textContent).not.toContain('Удалить');
        expect(fixture.nativeElement.textContent).not.toContain('Только просмотр');
    });

    it('shows load errors with retry and an empty history', () => {
        const error = new Error('network');
        settings.loadPage.mockReturnValue(throwError(() => error));
        component.refresh();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Не удалось загрузить настройки');
        expect(component.pageRequest.status()).toBe('error');
        expect(component.pageRequest.errors()).toBe(error);
        expect(component.pageRequest.loading()).toBe(false);
        expect(component.current()).toBeNull();
        settings.loadPage.mockReturnValue(of({ current: version(2), history: { page: 1, count: 0, total: 0, activeVersion: null, items: [] } }));
        component.refresh();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('нет версий настроек');
        expect(component.pageRequest.status()).toBe('success');
        expect(component.pageRequest.errors()).toBeNull();
    });

    it('displays loading and prevents opening dialogs or changing pages before the data arrives', () => {
        const response = new Subject<AppSettingsPageData>();
        settings.loadPage.mockReturnValue(response);
        component.refresh();
        fixture.detectChanges();
        expect(component.pageRequest.loading()).toBe(true);
        expect(fixture.nativeElement.textContent).toContain('Загружаем настройки');
        expect(fixture.nativeElement.querySelector('header button').disabled).toBe(true);
        component.openForm();
        component.openVersion(version(1));
        component.goToPage(2);
        expect(dialogs.openDialogs).toHaveLength(0);
        expect(component.page()).toBe(1);
        response.next(pageData());
        response.complete();
        fixture.detectChanges();
        expect(component.pageRequest.loading()).toBe(false);
        expect(fixture.nativeElement.textContent).toContain('Активная версия 2');
    });

    it('cancels an obsolete load and uses only the latest response after refreshing', () => {
        const obsolete = new Subject<AppSettingsPageData>();
        const latest = new Subject<AppSettingsPageData>();
        settings.loadPage.mockReturnValueOnce(obsolete).mockReturnValueOnce(latest);
        component.refresh();
        fixture.detectChanges();
        expect(obsolete.observed).toBe(true);
        component.refresh();
        fixture.detectChanges();
        expect(obsolete.observed).toBe(false);
        obsolete.next(pageData(1, 3));
        expect(component.current()).toBeNull();
        latest.next(pageData(1, 4));
        latest.complete();
        fixture.detectChanges();
        expect(component.current()?.version).toBe(4);
        expect(component.pageRequest.status()).toBe('success');
    });

    it('cancels loading and clears request state on logout, then reloads on login', () => {
        const response = new Subject<AppSettingsPageData>();
        settings.loadPage.mockReturnValue(response);
        component.refresh();
        fixture.detectChanges();
        authenticated.set(false);
        fixture.detectChanges();
        expect(response.observed).toBe(false);
        expect(component.current()).toBeNull();
        expect(component.history()).toBeNull();
        expect(component.pageRequest.status()).toBe('idle');
        expect(component.pageRequest.errors()).toBeNull();
        settings.loadPage.mockReturnValue(of(pageData()));
        authenticated.set(true);
        fixture.detectChanges();
        expect(component.current()?.version).toBe(2);
        expect(component.pageRequest.status()).toBe('success');
    });

    it('closes popups and cancels saving if admin access is lost', async () => {
        const response = new Subject<AppSettingsVersionDto>();
        settings.create.mockReturnValue(response);
        component.openForm();
        fixture.detectChanges();
        const creation = dialogs.openDialogs[0].componentInstance;
        if (!(creation instanceof SettingsCreateDialogComponent)) throw new Error('Expected creation dialog');
        creation.save();
        admin.set(false);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.current()).toBeNull();
        expect(component.history()).toBeNull();
        expect(response.observed).toBe(false);
        expect(dialogs.openDialogs).toHaveLength(0);
        jest.clearAllMocks();
        component.refresh();
        component.openForm();
        component.openVersion(version(1));
        fixture.detectChanges();
        expect(settings.loadPage).not.toHaveBeenCalled();
        expect(dialogs.openDialogs).toHaveLength(0);
    });

    it('closes version popups when leaving the settings page', async () => {
        component.openVersion(version(1));
        fixture.detectChanges();
        fixture.destroy();
        await fixture.whenStable();
        expect(dialogs.openDialogs).toHaveLength(0);
    });
});
