import { Component, inject, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@am-front/services/auth.service';
import { CartBadgeComponent } from '@am-front/core/cart-badge/cart-badge.component';
import { HeaderComponent } from '@am-front/core/header/header.component';
import { ProfileComponent } from '@am-front/core/profile/profile.component';


@Component({
    selector: 'amstore-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        HeaderComponent,
        CartBadgeComponent,
        ProfileComponent,
        RouterOutlet,
    ],
    host: {
        class: 'amstore-root'
    },
})
export class AppComponent {
    private authService: AuthService = inject(AuthService);

    public date: Date = new Date();

    constructor() {
        this.authService.tryToRefresh();
    }
}
