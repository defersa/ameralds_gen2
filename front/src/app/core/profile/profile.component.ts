import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from 'src/app/services/auth.service';
import { IUser } from "@am/interface/profile.interface";

import { AmstoreLoginComponent } from './login/login.component';
import { DialogService } from "../dialog/dialog.service";
import { AsyncPipe } from "@angular/common";
import { AmstoreButtonRoundComponent } from "@am/cdk/buttons/round/round.component";
import { RouterLink } from "@angular/router";
import { IconsComponent } from "@am/cdk/icons/icons.component";


@Component({
    selector: "amstore-profile",
    templateUrl: "./profile.component.html",
    styleUrls: ["./profile.component.scss"],
    standalone: true,
    imports: [
        AsyncPipe,
        AmstoreButtonRoundComponent,
        RouterLink,
        IconsComponent
    ],
    host: {
        class: "amstore-profile"
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
        this.authService.deleteToken();
    }
}
