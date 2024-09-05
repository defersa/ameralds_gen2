import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SnapshotAdminOrderComponent} from './snapshot-admin-order.component';
import {LangHandlerModule} from "../../lang-text/lang-handler.module";
import {AmstoreIconModule} from "@am/cdk/icons/icons.module";
import {RouterModule} from "@angular/router";


@NgModule({
    declarations: [
        SnapshotAdminOrderComponent,
    ],
    exports: [
        SnapshotAdminOrderComponent,
    ],
    imports: [
        CommonModule,
        LangHandlerModule,
        AmstoreIconModule,
        RouterModule,
    ]
})
export class SnapshotAdminOrderModule {
}
