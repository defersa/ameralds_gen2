import { Component } from '@angular/core';
import { MenuComponent } from "@am-front/shared/menu/menu.component";
import { RouterOutlet } from "@angular/router";


@Component({
    selector: "app-store",
    templateUrl: "./store.component.html",
    styleUrls: ["./store.component.scss"],
    host: {
        class: "grid"
    },
    imports: [
        MenuComponent,
        RouterOutlet
    ]
})
export class StoreComponent {
}
