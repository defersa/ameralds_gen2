import { Component, ViewEncapsulation } from '@angular/core';
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { UserEnum } from "@am/utils/router-builder";
import { ProfileService } from "@am/services/profile.service";
import { AuthService } from "@am/services/auth.service";


@Component({
    selector: 'amstore-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'amstore-root'
    }
})
export class AppComponent {
    public date: Date = new Date();
    public isAdmin: Observable<boolean> = this.profileService.userStatus$
        .pipe(map((value: UserEnum) => value === UserEnum.Moder));

    constructor(
        private authService: AuthService,
        private profileService: ProfileService,
    ) {
        this.authService.tryToRefresh();
    }
}
