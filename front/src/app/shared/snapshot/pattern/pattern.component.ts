import { Component, inject, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { expandAnimation } from '@am/cdk/animations/expand';
import { LangType } from '@am/interface/lang.interface';
import { GoodsCard, ProductLite } from '@am/interface/goods.intreface';
import { ImageModelSmall } from '@am/interface/image.interface';
import { IPattern } from '@am/interface/pattern.interface';
import { GoodsService } from '@am/services/goods.service';
import { LangService } from '@am/services/lang.service';
import { ProfileService } from '@am/services/profile.service';

import { AmstoreSnapshotBaseDirective } from '../snapshot.base.directive';
import { DestroyService } from "@am/utils/destroy.service";


@Component({
    selector: 'amstore-snapshot-pattern',
    templateUrl: './pattern.component.html',
    styleUrls: ['./pattern.component.scss', '../snapshot.mobile.scss'],
    providers: [
        DestroyService,
    ],
})
export class AmstoreSnapshotPatternComponent extends AmstoreSnapshotBaseDirective implements OnInit {
    @Input()
    public pattern: IPattern;

    public status: 'buy' | 'remove' | 'bought' = 'buy';

    protected onDestroy: DestroyService = inject(DestroyService);

    constructor(protected injector: Injector,
                private profileService: ProfileService,
                private langService: LangService,
                private goodsService: GoodsService) {
        super(injector);

    }

    public ngOnInit(): void {
        combineLatest([
            this.goodsService.goods$,
            this.profileService.boughtPatterns$
        ]).pipe(takeUntil(this.onDestroy))
            .subscribe(() => {
                this.status = 'buy';
                const goods: GoodsCard = this.goodsService.goods$.value;
                const bought: number[] = this.profileService.boughtPatterns$.value;
                if (goods.patterns.find((value: ProductLite) => value.id === this.pattern.id)) {
                    this.status = 'remove';
                }
                if (bought.find((value: number) => value === this.pattern.id)) {
                    this.status = 'bought';
                }
            })
    }
}
