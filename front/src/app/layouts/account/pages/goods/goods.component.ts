import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GoodsCard, GoodsStatusResult } from 'src/app/interface/goods.intreface';
import { IPattern } from 'src/app/interface/pattern.interface';
import { GoodsService } from 'src/app/services/goods.service';
import { ProfileService } from 'src/app/services/profile.service';

@Component({
    selector: 'app-goods',
    templateUrl: './goods.component.html',
    styleUrls: ['./goods.component.scss']
})
export class GoodsComponent implements OnInit, OnDestroy {

    protected destroyed: Subject<void> = new Subject<void>();

    public patterns: IPattern[] = [];
    public jewels: any[] = [];

    public get totalPrice(): Subject<number> {
        return this.goodsService.goodsPrice;
    };

    constructor(
        private goodsService: GoodsService,
        private profileService: ProfileService
    ) {
        this.goodsService.goods$.pipe(takeUntil(this.destroyed)).subscribe((item: GoodsCard) => {
            this.patterns = item.patterns;
            this.jewels = item.jewels;
        })
    }

    ngOnInit(): void {
    }

    ngOnDestroy(): void {
        this.destroyed.next();
        this.destroyed.complete();
    }
    public buy(): void {
        this.goodsService.buyGoods().subscribe((result: GoodsStatusResult) => {
            if(result.result){
                this.goodsService.goods = result.goods;
                this.profileService.rawBoughtPatterns = result.patterns;
            }
        });
    }

}
