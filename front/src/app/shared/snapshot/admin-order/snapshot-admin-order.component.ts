import { Component, Input } from '@angular/core';
import { IAdminOrderShort } from "@am/interface/order.interface";

@Component({
    selector: 'amstore-snapshot-admin-order',
    templateUrl: './snapshot-admin-order.component.html',
    styleUrls: ['./snapshot-admin-order.component.scss']
})
export class SnapshotAdminOrderComponent {
    @Input()
    public order: IAdminOrderShort;

    @Input()
    public routerLink: (string | number)[];
}
