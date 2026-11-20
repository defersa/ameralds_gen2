import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, EMPTY, filter, ReplaySubject, startWith, Subject, switchMap } from 'rxjs';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import type { PatternEntityDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { PatternsService } from '@am-front/services/patterns.service';
import { PatternPreviewActionsComponent } from '@am-front/shared/details/pattern-preview-actions/pattern-preview-actions.component';
import { AmstorePatternsFilterComponent, type PatternsFilterValues } from '@am-front/shared/filters/patterns-filters/patterns-filters.component';
import { AmstorePatternsSkeletonComponent } from '@am-front/shared/skeletons/patterns-skeleton.component';
import { AmstoreSnapshotPatternComponent } from '@am-front/shared/snapshot/pattern/pattern.component';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';


@Component({
    selector: 'amstore-purchased-patterns',
    templateUrl: './patterns.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AmstorePatternsFilterComponent,
        AmstoreSnapshotPatternComponent,
        PatternPreviewActionsComponent,
        AmstorePatternsSkeletonComponent,
        AmstoreButtonComponent,
    ],
})
export class PatternsComponent {
    private readonly service = inject(PatternsService);
    private readonly auth = inject(AuthService);
    private readonly retry$ = new Subject<void>();

    public readonly filtersUpdate$ = new ReplaySubject<PatternsFilterValues>(1);
    public readonly patterns = signal<PatternEntityDto[]>([]);
    public readonly pagesCount = signal(1);
    public readonly load = createRequestWrapper<typeof this.service.getPurchasedPatterns>(
        this.service.getPurchasedPatterns.bind(this.service),
    );

    /** Загружает покупки по фильтрам URL и текущей сессии, отменяя устаревшие запросы и очищая результаты при выходе. */
    constructor() {
        combineLatest([
            this.filtersUpdate$
                .pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))),
            toObservable(this.auth.auth),
            toObservable(this.auth.sessionRevisionSignal),
        ])
            .pipe(
                switchMap(([filters, authenticated, revision]) => {
                    this.patterns.set([]);
                    this.pagesCount.set(1);
                    this.load.clear();

                    if (!authenticated) {
                        return EMPTY;
                    }

                    return this.retry$
                        .pipe(
                            startWith(undefined),
                            switchMap(() => this.load.request(
                                filters.page ?? 1, filters.sizes, filters.categories, filters.query,
                            )
                                .pipe(filter(() => this.auth.auth() && this.auth.sessionRevision === revision))),
                        );
                }),
                takeUntilDestroyed(),
            )
            .subscribe(response => {
                this.patterns.set(response.items);
                this.pagesCount.set(response.count);
            });
    }

    /** Повторяет загрузку с текущими фильтрами после ошибки, блокируя повторный запрос во время загрузки. */
    public retry(): void {
        if (this.load.loading() || !this.auth.auth()) {
            return;
        }

        this.retry$.next();
    }
}
