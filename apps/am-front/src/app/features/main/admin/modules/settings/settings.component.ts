import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { AmstoreButtonRoundComponent } from '@am-front/cdk/buttons/round/round.component';
import { AmstorePaginatorComponent } from '@am-front/cdk/paginator/paginator.component';
import { IconsComponent } from '@am-front/cdk/icons/icons.component';
import type { AppSettingsVersionDto } from '@am-front/root/api-v2';
import { DialogService } from '@am-front/core/dialog/dialog.service';
import { AppSettingsService, type AppSettingsPageData } from '@am-front/services/app-settings.service';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';
import { SettingsCreateDialogComponent } from './create-dialog/settings-create-dialog.component';
import { SettingsVersionDialogComponent } from './version-dialog/settings-version-dialog.component';

const SETTINGS_DIALOG_CONFIG = {
    width: '560px', minWidth: '0', maxWidth: 'calc(100vw - 32px)',
} satisfies MatDialogConfig<AppSettingsVersionDto>;

@Component({
    selector: 'amstore-admin-settings',
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DatePipe, AmstoreButtonRoundComponent, AmstorePaginatorComponent, IconsComponent],
})
export class SettingsComponent {
    private readonly settings = inject(AppSettingsService);
    private readonly auth = inject(AuthService);
    private readonly profile = inject(ProfileService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly dialogs = inject(DialogService);
    private readonly reloadId = signal(0);
    private readonly pageData = signal<AppSettingsPageData | null>(null);
    private activeDialog?: MatDialogRef<unknown, unknown>;

    public readonly pageRequest = createRequestWrapper<typeof this.settings.loadPage>(this.settings.loadPage.bind(this.settings));
    public readonly canAccess = computed(() => this.auth.auth() && this.profile.isAdmin());
    public readonly current = computed(() => this.pageData()?.current ?? null);
    public readonly history = computed(() => this.pageData()?.history ?? null);
    public readonly page = signal(1);
    public readonly dialogOpen = signal(false);
    public readonly savedVersion = signal<number | null>(null);

    constructor() {
        this.destroyRef.onDestroy(() => this.activeDialog?.close());
        effect(onCleanup => {
            const access = this.canAccess();
            const page = this.page();
            this.reloadId();
            untracked(() => {
                this.pageData.set(null);
                if (!access) {
                    this.activeDialog?.close();
                    this.pageRequest.clear();
                    this.savedVersion.set(null);
                    return;
                }
                const request = this.pageRequest.request(page).subscribe(result => this.pageData.set(result));
                // Обёртка завершает запрос при destroy; cleanup также отменяет устаревшие загрузки.
                onCleanup(() => request.unsubscribe());
            });
        });
    }

    public openForm(): void {
        const current = this.current();
        if (!this.canAccess() || !current || this.pageRequest.loading() || this.dialogOpen()) return;
        this.savedVersion.set(null);
        const dialog = this.dialogs.openCustomDialog<SettingsCreateDialogComponent, AppSettingsVersionDto, AppSettingsVersionDto>(
            SettingsCreateDialogComponent, { ...SETTINGS_DIALOG_CONFIG, data: current },
        );
        this.activeDialog = dialog;
        this.dialogOpen.set(true);
        dialog.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(version => {
            this.activeDialog = undefined;
            this.dialogOpen.set(false);
            if (this.canAccess() && version) {
                this.savedVersion.set(version.version);
                this.page.set(1);
                this.refresh();
            }
        });
    }

    public openVersion(version: AppSettingsVersionDto): void {
        if (!this.canAccess() || this.pageRequest.loading() || this.dialogOpen()) return;
        const dialog = this.dialogs.openCustomDialog(SettingsVersionDialogComponent, { ...SETTINGS_DIALOG_CONFIG, data: version });
        this.activeDialog = dialog;
        this.dialogOpen.set(true);
        dialog.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.activeDialog = undefined;
            this.dialogOpen.set(false);
        });
    }

    public refresh(): void {
        this.reloadId.update(value => value + 1);
    }

    public goToPage(page: number): void {
        if (this.pageRequest.loading() || this.dialogOpen() || !Number.isSafeInteger(page) || page < 1 || page > (this.history()?.count ?? 0)) return;
        this.page.set(page);
    }
}
