import { Component, } from '@angular/core';
import { RouterOutlet } from "@angular/router";


@Component({
    selector: "amstore-auth",
    templateUrl: "./auth.component.html",
    styleUrls: ["./auth.component.scss"],
    imports: [
        RouterOutlet
    ]
})
export class AuthComponent {
}
