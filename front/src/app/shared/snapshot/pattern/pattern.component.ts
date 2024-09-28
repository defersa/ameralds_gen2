import {
    Component,
    computed,
    inject,
    input,
    InputSignal,
    Signal
} from "@angular/core";
import { GoodsCard } from '@am/interface/goods.intreface';
import { IPattern } from '@am/interface/pattern.interface';
import { GoodsService } from '@am/services/goods.service';
import { ProfileService } from '@am/services/profile.service';

import { AmstoreSnapshotBaseDirective } from '../snapshot.base.directive';
import { toSignal } from "@angular/core/rxjs-interop";
import { OutsideSrcDirective } from "@am/shared/outside-src/outside-src.directive";
import { RouterLink } from "@angular/router";
import { LangTextComponent } from "@am/shared/lang-text/lang-text.component";


@Component({
    selector: "amstore-snapshot-pattern",
    templateUrl: "./pattern.component.html",
    styleUrls: ["./pattern.component.scss", "../snapshot.mobile.scss"],
    standalone: true,
    imports: [
        OutsideSrcDirective,
        RouterLink,
        LangTextComponent
    ]
})
export class AmstoreSnapshotPatternComponent extends AmstoreSnapshotBaseDirective {
    public pattern: InputSignal<IPattern> = input();

    public status: Signal<'buy' | 'remove' | 'bought'> = computed(() => {
        const goods: GoodsCard = toSignal(this.goodsService.goods$)();
        const bought: number[] = toSignal(this.profileService.boughtPatterns$)();
        const pattern: IPattern = this.pattern();

        if (goods.patterns.find((value: IPattern) => value.id === pattern.id)) {
            return 'remove';
        } else  if (bought.find((value: number) => value === pattern.id)) {
            return 'bought';
        }

        return 'buy';
    });

    private profileService: ProfileService = inject(ProfileService);
    private goodsService: GoodsService = inject(GoodsService);
}
