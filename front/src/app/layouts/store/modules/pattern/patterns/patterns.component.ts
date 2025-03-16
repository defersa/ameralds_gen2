import { Component } from '@angular/core';
import { DestroyService } from "@am/utils/destroy.service";
import { AbstractPatternsIndex } from "@am/shared/actions/pattern/pattern-index.abstract";
import { AmstoreFilterComponent } from "@am/shared/filters/pattern/filter.component";
import { AmstoreSnapshotPatternComponent } from "@am/shared/snapshot/pattern/pattern.component";
import { ShortPatternDetailsComponent } from "@am/shared/details/pattern/short/short.component";
import { AsyncPipe } from "@angular/common";
import { AmstorePaginatorComponent } from "@am/cdk/paginator/paginator.component";


@Component({
    selector: "store-patterns",
    templateUrl: "./patterns.component.html",
    styleUrls: ["./patterns.component.scss"],
    providers: [DestroyService],
    imports: [
        AmstoreFilterComponent,
        AmstoreSnapshotPatternComponent,
        ShortPatternDetailsComponent,
        AsyncPipe,
        AmstorePaginatorComponent
    ]
})
export class PatternsComponent extends AbstractPatternsIndex {
}
