import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminOrderDetailsPatternDto, downloadFile } from '@am-front/root/api-v2';
import { AdminOrdersService } from '@am-front/services/admin-orders.service';
import { AuthService } from '@am-front/services/auth.service';
import { LangService } from '@am-front/services/lang.service';
import { ProfileService } from '@am-front/services/profile.service';
import { SnackService } from '@am-front/services/snackbar.service';


interface PatternAdminDownloadFile {
    id: number;
    format: 'cbb' | 'pdf';
}

@Component({
    selector: 'amstore-pattern-admin-download',
    templateUrl: './pattern-admin-download.component.html',
    styleUrls: ['./pattern-admin-download.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block min-w-0' },
})
export class PatternAdminDownloadComponent {
    public readonly orderId = input.required<number>();
    public readonly orderPattern = input.required<AdminOrderDetailsPatternDto>();

    private readonly adminOrdersService = inject(AdminOrdersService);
    private readonly authService = inject(AuthService);
    private readonly profileService = inject(ProfileService);
    private readonly langService = inject(LangService);
    private readonly snackService = inject(SnackService);
    private readonly destroyRef = inject(DestroyRef);

    public readonly downloading = signal<ReadonlySet<number>>(new Set());
    public readonly canDownload = computed(() => this.authService.auth() && this.profileService.isAdmin());
    public readonly sizes = computed(() => {
        const item = this.orderPattern();
        const sizesById = new Map((item.pattern?.sizes ?? []).map((size) => [size.id, size]));

        return (item.sizes ?? []).map((selected) => {
            const size = sizesById.get(selected.id);
            const value = selected.size?.value ?? size?.size?.value;
            const files: PatternAdminDownloadFile[] = [
                { id: size?.cbb, format: 'cbb' },
                { id: size?.pdf, format: 'pdf' },
            ];

            return {
                id: selected.id,
                label: value == null ? 'Размер недоступен' : `${value} ${this.langService.sizeUnit()}`,
                files: files.filter((file) => file.id > 0),
            };
        });
    });

    public download(event: Event, fileId: number): void {
        event.preventDefault();

        if (!this.canDownload() || this.downloading().has(fileId)) {
            return;
        }

        const size = this.sizes().find((size) => size.files.some((file) => file.id === fileId));
        const file = size?.files.find((file) => file.id === fileId);

        if (!file) {
            return;
        }

        const pattern = this.orderPattern().pattern;
        const name = pattern?.name?.[this.langService.lang()] || `Схема ${pattern?.id ?? this.orderPattern().id}`;
        const filename = `${name} - ${size.label}.${file.format}`;
        this.downloading.update((ids) => new Set([...ids, fileId]));

        this.adminOrdersService.downloadOrderFile(this.orderId(), fileId)
            .pipe(
                finalize(() => this.downloading.update((ids) => {
                    const remaining = new Set(ids);
                    remaining.delete(fileId);

                    return remaining;
                })),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (blob) => downloadFile(blob, filename),
                error: () => this.snackService.warn('Не удалось скачать файл. Попробуйте ещё раз'),
            });
    }
}
