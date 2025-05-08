import { Component, inject } from "@angular/core";
import { AmstoreSnapshotPatternComponent } from "@am/shared/snapshot/pattern/pattern.component";
import { AsyncPipe } from "@angular/common";
import { ShortPatternDetailsComponent } from "@am/shared/details/pattern/short/short.component";
import { CartService, ICartPattern } from "@am/services/cart.service";
import { PatternsService } from "@am/services/patterns.service";
import { Observable } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { IdRecord } from "@am/interface/common.interface";
import type { PatternEntityDto } from "@am/root/api";
import { combineSwitchMap } from "@am/utils/combine-switch-map";
import { PatternCartShortComponent } from "@am/shared/actions/pattern/pattern-cart-short/pattern-cart-short.component";


@Component({
    selector: "amstore-cart",
    templateUrl: "./cart.component.html",
    styleUrls: ["./cart.component.scss"],
    standalone: true,
    imports: [
        AmstoreSnapshotPatternComponent,
        AsyncPipe,
        ShortPatternDetailsComponent,
        PatternCartShortComponent,
    ],
})
export class CartComponent {
    private readonly cartService: CartService = inject(CartService);
    private readonly patternService: PatternsService = inject(PatternsService);

    public items$: Observable<{ pattern: PatternEntityDto; cart: ICartPattern }[]> = this.cartService.patternsCart$
        .pipe(
            combineSwitchMap((cart: IdRecord<ICartPattern>) => this.patternService.getPatternsByIds(Object.keys(cart))),
            map(([cartObj, patterns]: [IdRecord<ICartPattern>, Record<string, PatternEntityDto>]) => Object.entries(cartObj)
                .map(([key, cart]: [string, ICartPattern]) => ({ cart, pattern: patterns[key] }))),
        );

}
