import { Component, inject } from "@angular/core";
import { Subject } from 'rxjs';
import { GoodsService } from 'src/app/services/goods.service';
import { AmstoreButtonRoundComponent } from "@am/cdk/buttons/round/round.component";
import { AsyncPipe } from "@angular/common";
import { IconsComponent } from "@am/cdk/icons/icons.component";


@Component({
    selector: "amstore-goods-snap",
    templateUrl: "./goods-snap.component.html",
    styleUrls: ["./goods-snap.component.scss"],
    standalone: true,
    imports: [
        AmstoreButtonRoundComponent,
        AsyncPipe,
        IconsComponent
    ]
})
export class GoodsSnapComponent{
    public get goodsCount(): Subject<number> {
        return this.goodsService.goodsCount;
    }
    public get goodsPrice(): Subject<number> {
        return this.goodsService.goodsPrice;
    }

    private goodsService: GoodsService = inject(GoodsService);
}
