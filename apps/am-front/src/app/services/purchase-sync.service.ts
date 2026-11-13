import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, finalize, forkJoin, fromEvent, map, merge, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { UserCartService } from './cart/sources/user-cart.service';
import { ProfileService } from './profile.service';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';


@Injectable({ providedIn: 'root' })
export class PurchaseSyncService {
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    private readonly cart = inject(UserCartService);
    private readonly profile = inject(ProfileService);
    private readonly storageKey = 'amstore:purchase-updated';
    private readonly minimumRefreshIntervalMs = 30_000;
    private readonly refresh = createRequestWrapper<typeof this.refreshState>(this.refreshState.bind(this));
    private lastRefreshStartedAt = 0;
    private lastRefreshSessionRevision: number | null = null;
    private refreshPending = false;

    /** Подписывается на возврат во вкладку и события покупки; фоновых таймеров и запросов при старте нет. */
    constructor() {
        const window = this.document.defaultView;

        if (!window) {
            return;
        }

        merge(
            fromEvent(window, 'focus'),
            fromEvent(this.document, 'visibilitychange'),
        )
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.refreshCurrentTab());

        fromEvent<StorageEvent>(window, 'storage')
            .pipe(
                filter((event) => event.key === this.storageKey),
                takeUntilDestroyed(),
            )
            .subscribe(() => this.refreshCurrentTab(true));
    }

    /** После подтверждения сервером обновляет корзину и права и сообщает другим вкладкам лишь о необходимости перечитать их. */
    public purchaseConfirmed(): void {
        this.refreshCurrentTab(true);

        try {
            this.document.defaultView?.localStorage.setItem(this.storageKey, crypto.randomUUID());
        } catch {
            // При недоступном storage другие вкладки перечитывают данные при следующем возврате пользователя.
        }
    }

    /**
     * При возврате перечитывает данные не чаще раза в 30 секунд для текущей сессии, объединяя focus и visibilitychange.
     * invalidated обходит эту паузу после покупки; уведомление в скрытой вкладке или во время запроса сохраняется до обновления.
     * Ошибка допускает повтор при следующем возврате после паузы; после уничтожения сервиса запросы не запускаются.
     */
    private refreshCurrentTab(invalidated = false): void {
        this.refreshPending ||= invalidated;

        if (this.destroyRef.destroyed || !this.auth.auth() || this.document.visibilityState === 'hidden' || this.refresh.loading()) {
            return;
        }

        const now = Date.now();
        const sessionRevision = this.auth.sessionRevision;

        if (!this.refreshPending && this.lastRefreshSessionRevision === sessionRevision &&
            now - this.lastRefreshStartedAt < this.minimumRefreshIntervalMs) {
            return;
        }

        this.refreshPending = false;
        this.lastRefreshStartedAt = now;
        this.lastRefreshSessionRevision = sessionRevision;

        this.refresh.request()
            .pipe(finalize(() => {
                if (this.refresh.loading()) {
                    this.refresh.clear();
                }

                if (this.refreshPending) {
                    this.refreshCurrentTab();
                }
            }))
            .subscribe();
    }

    /** Перечитывает серверный состав и эффективные права; сетевые ошибки допускают повтор при следующем событии. */
    private refreshState(): Observable<void> {
        return forkJoin([this.cart.refreshCart(), this.profile.loadProfile(true)])
            .pipe(map(() => undefined));
    }
}
