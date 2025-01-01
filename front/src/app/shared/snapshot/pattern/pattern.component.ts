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
    standalone: true,
    imports: [
        RouterLink,
        LangTextComponent
    ]
})
export class AmstoreSnapshotPatternComponent extends AmstoreSnapshotBaseDirective {
    public pattern: InputSignal<PatternEntityDto> = input();

    public status: Signal<'buy' | 'remove' | 'bought'> = computed(() => {
        // const goods: GoodsCard = toSignal(this.goodsService.goods$)();
        // const bought: number[] = toSignal(this.profileService.boughtPatterns$)();
        // const pattern: PatternEntityDto = this.pattern();
        //
        // if (goods.patterns.find((value: PatternEntityDto) => value.id === pattern.id)) {
        //     return 'remove';
        // } else  if (bought.find((value: number) => value === pattern.id)) {
        //     return 'bought';
        // }

        return 'buy';
    });

    private profileService: ProfileService = inject(ProfileService);
    private goodsService: CartService = inject(CartService);
}
