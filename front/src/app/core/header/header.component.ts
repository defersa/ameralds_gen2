import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";


@Component({
    selector: "amstore-header",
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"],
    standalone: true,
    imports: [
        RouterLink
    ],
    host: {
        class: "amstore-header"
    }
})
export class HeaderComponent {
}
