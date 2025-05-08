import {
    Component,
    computed,
    inject,
    input,
    InputSignal,
    Signal
} from "@angular/core";
import { GoodsCard } from '@am/interface/goods.intreface';
import { CartService } from '@am/services/cart.service';
import { ProfileService } from '@am/services/profile.service';

import { AmstoreSnapshotBaseDirective } from '../snapshot.base.directive';
import { toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { LangTextComponent } from "@am/shared/lang-text/lang-text.component";
import type { PatternEntityDto } from "@am/root/api";


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
    public pattern: InputSignal<PatternEntityDto> = input();
}
