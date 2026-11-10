import {
    Component,
    input,
} from "@angular/core";

import { AmstoreSnapshotBaseDirective } from '../snapshot.base.directive';
import { RouterLink } from "@angular/router";
import { LangTextComponent } from "@am-front/shared/lang-text/lang-text.component";
import type { PurchasedOrderPatternDto } from "@am-front/root/api-v2";


@Component({
    selector: "amstore-snapshot-pattern",
    templateUrl: "./pattern.component.html",
    styleUrls: ["./pattern.component.scss", "../snapshot.mobile.scss"],
    imports: [
        RouterLink,
        LangTextComponent
    ]
})
export class AmstoreSnapshotPatternComponent extends AmstoreSnapshotBaseDirective {
    public pattern = input.required<Pick<PurchasedOrderPatternDto, 'name' | 'images'>>();
}
