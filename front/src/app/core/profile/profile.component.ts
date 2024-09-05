import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from 'src/app/services/auth.service';
import { IUser } from "@am/interface/profile.interface";
import { ProfileService } from "@am/services/profile.service";

import { AmstoreLoginComponent } from './login/login.component';
import { DialogService } from "../dialog/dialog.service";


@Component({
    selector: 'amstore-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    host: {
        class: 'amstore-profile'
    }
})
export class ProfileComponent {

    public get authStatus(): BehaviorSubject<boolean> {
        return this.authService.authStatus$;
    }


    public get profile(): IUser | null {
        return this._profile;
    }
    public set profile(value: IUser | null) {
        this._profile = value;
    }

    private _profile: IUser | null = null;

    constructor(
        private authService: AuthService,
        private profileService: ProfileService,
        private _dialog: DialogService,
    ) {
    }

    public login(): void {
        this._dialog.openCustomDialog(AmstoreLoginComponent, {
            panelClass: "amstore-dialog-login-panel",
            minWidth: '400px'
        });
    }

    public logout(): void {
        this.authService.logout();
    }
}
