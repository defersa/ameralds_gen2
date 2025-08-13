import { Component } from '@angular/core';
import { DestroyService } from "@am-front/utils/destroy.service";
import { AbstractPatternsIndex } from "@am-front/shared/actions/pattern/pattern-index.abstract";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { RouterLink } from "@angular/router";
import { AmstoreFilterComponent } from "@am-front/shared/filters/pattern/filter.component";
import { AmstoreSnapshotPatternComponent } from "@am-front/shared/snapshot/pattern/pattern.component";
import { AsyncPipe } from "@angular/common";
import { ShortPatternDetailsComponent } from "@am-front/shared/details/pattern/short/short.component";
import { AmstorePaginatorComponent } from "@am-front/cdk/paginator/paginator.component";


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
