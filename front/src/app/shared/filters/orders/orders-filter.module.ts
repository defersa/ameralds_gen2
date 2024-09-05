import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdersFilterComponent } from './orders-filter.component';
import { AmstoreCdkModule } from "@am/cdk/cdk.module";


@NgModule({
    declarations: [
        OrdersFilterComponent,
    ],
    exports: [
        OrdersFilterComponent,
    ],
    imports: [
        CommonModule,
        AmstoreCdkModule
    ]
})
export class OrdersFilterModule {
}
