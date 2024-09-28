import { Component } from '@angular/core';
import { MenuComponent } from "@am/shared/menu/menu.component";
import { RouterOutlet } from "@angular/router";


@Component({
    selector: "amstore-admin",
    templateUrl: "./admin.component.html",
    styleUrls: ["./admin.component.scss"],
    standalone: true,
    imports: [
        MenuComponent,
        RouterOutlet
    ]
})
export class AmstoreAdminComponent {
}
