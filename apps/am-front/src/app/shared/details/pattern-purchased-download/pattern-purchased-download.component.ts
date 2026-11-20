import { ChangeDetectionStrategy, Component, computed, inject, input, type InputSignal } from '@angular/core';
import { downloadFile, type FullPatternEntityDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { LangService } from '@am-front/services/lang.service';
import { PatternsService } from '@am-front/services/patterns.service';
import { ProfileService } from '@am-front/services/profile.service';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';


interface PurchasedPatternFile {
    id: number;
    label: string;
    filename: string;
}

@Component({
    selector: 'amstore-pattern-purchased-download',
    templateUrl: './pattern-purchased-download.component.html',
    styleUrl: './pattern-purchased-download.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block min-w-0' },
})
export class PatternPurchasedDownloadComponent {
    public readonly pattern: InputSignal<FullPatternEntityDto> = input.required();

    private readonly authService = inject(AuthService);
    private readonly profileService = inject(ProfileService);
    private readonly patternsService = inject(PatternsService);
    private readonly langService = inject(LangService);

    public readonly auth = this.authService.auth;
    public readonly downloadRequest = createRequestWrapper<typeof this.patternsService.downloadPurchasedFile>(
        this.patternsService.downloadPurchasedFile.bind(this.patternsService),
    );

    private readonly purchases = computed(() => {
        const patternId = this.pattern().id;

        return this.auth() ? this.profileService.boughtPatterns()
            .filter((item) => item.pattern?.id === patternId) : [];
    });

    private readonly name = computed(() => this.pattern().name?.[this.langService.lang()] || `Схема ${this.pattern().id}`);

    public readonly sizes = computed(() => {
        const patternSizes = new Map(this.pattern().sizes
            .map((size) => [size.id, size]));

        const purchasedSizes = new Map(this.purchases()
            .flatMap((item) => item.sizes ?? [])
            .map((size) => [size.id, size]));

        return [...purchasedSizes.values()]
            .map((purchased) => {
                const size = patternSizes.get(purchased.id);
                const value = purchased.size?.value ?? size?.size?.value;
                const label = value == null ? 'Размер недоступен' : `${value} ${this.langService.sizeUnit()}`;

                const files: PurchasedPatternFile[] = [
                    {
                        id: size?.cbb ?? 0,
                        label: 'CBB',
                        filename: `${this.name()} - ${label}.cbb`,
                    },
                    {
                        id: size?.pdf ?? 0,
                        label: 'PDF',
                        filename: `${this.name()} - ${label}.pdf`,
                    },
                    {
                        id: size?.png ?? 0,
                        label: 'PNG',
                        filename: `${this.name()} - ${label}.png`,
                    },
                ];

                return {
                    id: purchased.id,
                    label,
                    files: files
                        .filter((file) => file.id > 0),
                };
            });
    });

    public readonly colorOwned = computed(() => this.purchases()
        .some((item) => item.color));

    public readonly colorFile = computed<PurchasedPatternFile | null>(() => {
        const file = this.pattern().color;

        const hasSize = this.purchases()
            .some((item) => item.sizes
                .some((purchased) => this.pattern().sizes
                    .some((size) => size.id === purchased.id && size.size?.id === purchased.size?.id)));

        if (!this.colorOwned() || !hasSize || !file?.id) {
            return null;
        }

        const extension = /\.[^.]+$/.exec(file.name)?.[0] ?? '';

        return {
            id: file.id,
            label: 'Скачать подбор цвета',
            filename: `${this.name()} - Подбор цвета${extension}`,
        };
    });

    /** Перехватывает ссылку для Bearer-авторизации и сохраняет только файл из текущего набора купленных материалов. */
    public download(event: Event, fileId: number): void {
        event.preventDefault();

        if (!this.auth() || this.downloadRequest.loading()) {
            return;
        }

        const sizeFile = this.sizes()
            .flatMap((size) => size.files)
            .find((file) => file.id === fileId);

        const colorFile = this.colorFile();
        const file = sizeFile ?? (colorFile?.id === fileId ? colorFile : null);

        if (!file) {
            return;
        }

        const sessionRevision = this.authService.sessionRevision;

        this.downloadRequest.request(this.pattern().id, fileId)
            .subscribe((blob) => {
                if (this.auth() && this.authService.sessionRevision === sessionRevision) {
                    downloadFile(blob, file.filename);
                }
            });
    }
}
