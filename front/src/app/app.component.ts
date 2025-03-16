import { Component, Signal, ViewEncapsulation } from "@angular/core";
import { ProfileService } from "@am/services/profile.service";
import { AuthService } from "@am/services/auth.service";
import { toSignal } from "@angular/core/rxjs-interop";


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
    public date: Date = new Date();
    public isAdmin: Signal<boolean> = toSignal(this.profileService.isAdmin$);

    constructor(
        private authService: AuthService,
        private profileService: ProfileService,
    ) {
        this.authService.tryToRefresh();
    }
}
