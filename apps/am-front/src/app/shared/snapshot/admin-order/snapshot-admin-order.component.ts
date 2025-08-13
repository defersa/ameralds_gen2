import { Component, input, Input, InputSignal } from "@angular/core";
import { IAdminOrderShort } from "@am-front/interface/order.interface";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { RouterLink } from "@angular/router";
import { DatePipe } from "@angular/common";
import { LangTextComponent } from "@am-front/shared/lang-text/lang-text.component";


@Component({
    selector: "amstore-snapshot-admin-order",
    templateUrl: "./snapshot-admin-order.component.html",
    styleUrls: ["./snapshot-admin-order.component.scss"],
    imports: [
        IconsComponent,
        RouterLink,
        DatePipe,
        LangTextComponent
    ]
})
export class SnapshotAdminOrderComponent {
    public order: InputSignal<IAdminOrderShort> = input();
    public routerLink: InputSignal<(string | number)[]> = input();
}
