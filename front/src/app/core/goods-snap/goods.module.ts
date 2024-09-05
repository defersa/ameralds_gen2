import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoodsSnapComponent } from './goods-snap.component';
import { GoodsService } from 'src/app/services/goods.service';
import { AmstoreCdkModule } from '@am/cdk/cdk.module';


@NgModule({
    declarations: [GoodsSnapComponent],
    imports: [
        CommonModule,
        AmstoreCdkModule
    ],
    exports: [GoodsSnapComponent],
    providers: [
        GoodsService
    ]
})
export class AmstoreGoodsModule { }
