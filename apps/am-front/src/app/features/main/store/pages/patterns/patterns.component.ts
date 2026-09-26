import { Component, DestroyRef, inject, signal, WritableSignal } from '@angular/core';
import { DestroyService } from "@am-front/utils/destroy.service";
import { AmstoreSnapshotPatternComponent } from "@am-front/shared/snapshot/pattern/pattern.component";
import { PatternPreviewActionsComponent } from "@am-front/shared/details/pattern-preview-actions/pattern-preview-actions.component";
import {
    AmstorePatternsFilterComponent,
    PatternsFilterValues
} from '@am-front/shared/filters/patterns-filters/patterns-filters.component';
import { PatternsService } from '@am-front/services/patterns.service';
import type { PatternEntityDto, PatternsPaginatedPageDto } from '@am-front/root/api-v2';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { loadingHandler } from '@am-front/utils/loading-with';
import { AmstorePatternsSkeletonComponent } from '@am-front/shared/skeletons/patterns-skeleton.component';


@Component({
    selector: "amstore-patterns",
    templateUrl: "./patterns.component.html",
    styleUrls: ["./patterns.component.scss"],
    providers: [DestroyService],
    imports: [
        AmstoreSnapshotPatternComponent,
        PatternPreviewActionsComponent,
        AmstorePatternsFilterComponent,
        AmstorePatternsSkeletonComponent,
    ],
    standalone: true
})
export class PatternsComponent {
    protected patternsService: PatternsService = inject(PatternsService);
    protected destroyRef: DestroyRef = inject(DestroyRef);

    public readonly patterns: WritableSignal<PatternEntityDto[]> = signal([]);
    public readonly pagesCount: WritableSignal<number> = signal(1);
    public readonly loading: WritableSignal<boolean> = signal(false);

    public readonly filtersUpdate$: Subject<PatternsFilterValues> = new Subject();

    constructor() {
        this.filtersUpdate$
            .pipe(
                distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
                switchMap(({ page, sizes, categories, query }: PatternsFilterValues) =>
                    this.patternsService.getPatterns(page, sizes, categories, query)
                        .pipe(loadingHandler(this.loading)),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((response: PatternsPaginatedPageDto) => {
                this.patterns.set(response.items);
                this.pagesCount.set(response.count);
            });
    }
}
