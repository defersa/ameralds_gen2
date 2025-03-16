import { Component } from '@angular/core';
import { DestroyService } from "@am/utils/destroy.service";
import { AbstractPatternsIndex } from "@am/shared/actions/pattern/pattern-index.abstract";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { RouterLink } from "@angular/router";
import { AmstoreFilterComponent } from "@am/shared/filters/pattern/filter.component";
import { AmstoreSnapshotPatternComponent } from "@am/shared/snapshot/pattern/pattern.component";
import { AsyncPipe } from "@angular/common";
import { ShortPatternDetailsComponent } from "@am/shared/details/pattern/short/short.component";
import { AmstorePaginatorComponent } from "@am/cdk/paginator/paginator.component";


@Component({
    selector: "admin-patterns",
    templateUrl: "./patterns.component.html",
    styleUrls: ["./patterns.component.scss"],
    providers: [DestroyService],
    imports: [
        AmstoreButtonComponent,
        IconsComponent,
        RouterLink,
        AmstoreFilterComponent,
        AmstoreSnapshotPatternComponent,
        AsyncPipe,
        ShortPatternDetailsComponent,
        AmstorePaginatorComponent
    ]
})
export class PatternsComponent extends AbstractPatternsIndex {
}
