import { Component } from "@angular/core";
import { MenuComponent } from "@am/shared/menu/menu.component";
import { RouterOutlet } from "@angular/router";


@Component({
    templateUrl: "./account.component.html",
    styleUrls: ["./account.component.scss"],
    imports: [
        MenuComponent,
        RouterOutlet
    ],
    standalone: true
})
export class AccountComponent {
}
