import { Component, OnInit } from '@angular/core';
import { Subject } from "rxjs";
import { GoodsService } from "@am/services/goods.service";


@Component({
    selector: 'amstore-header-admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss']
})
export class AmstoreHeaderAdminComponent implements OnInit {

    public get goodsCount(): Subject<number> {
        return this.goodsService.goodsCount;
    }
    public get goodsPrice(): Subject<number> {
        return this.goodsService.goodsPrice;
    }

    constructor(
        private goodsService: GoodsService,
    ) { }

    ngOnInit(): void {
    }

}
