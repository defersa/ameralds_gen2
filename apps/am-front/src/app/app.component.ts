import { Component, inject, Signal, ViewEncapsulation } from '@angular/core';
import { ProfileService } from '@am-front/services/profile.service';
import { AuthService } from '@am-front/services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';


@Component({
    selector: 'amstore-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'amstore-root'
    },
    standalone: false
})
export class AppComponent {
    private authService: AuthService = inject(AuthService);
    private profileService: ProfileService = inject(ProfileService);

    public date: Date = new Date();
    public isAdmin: Signal<boolean> = this.profileService.isAdmin;

    constructor() {
        this.authService.tryToRefresh();
    }
}
