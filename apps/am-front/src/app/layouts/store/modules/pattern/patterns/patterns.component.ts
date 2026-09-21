import { Component } from '@angular/core';
import { DestroyService } from "@am-front/utils/destroy.service";
import { AbstractPatternsIndex } from "@am-front/shared/actions/pattern/pattern-index.abstract";
import { AmstoreFilterComponent } from "@am-front/shared/filters/pattern/filter.component";
import { AmstoreSnapshotPatternComponent } from "@am-front/shared/snapshot/pattern/pattern.component";
import { ShortPatternDetailsComponent } from "@am-front/shared/details/pattern/short/short.component";
import { AmstorePaginatorComponent } from "@am-front/cdk/paginator/paginator.component";


@Component({
    templateUrl: "./patterns.component.html",
    styleUrls: ["./patterns.component.scss"],
    providers: [DestroyService],
    imports: [
        AmstoreFilterComponent,
        AmstoreSnapshotPatternComponent,
        ShortPatternDetailsComponent,
        AmstorePaginatorComponent
    ]
})
export class PatternsComponent extends AbstractPatternsIndex {
}
