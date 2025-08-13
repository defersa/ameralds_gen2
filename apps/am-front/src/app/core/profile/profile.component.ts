import { Component, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { IUser } from "@am-front/interface/profile.interface";

import { AmstoreLoginComponent } from './login/login.component';
import { DialogService } from "../dialog/dialog.service";
import { AsyncPipe } from "@angular/common";
import { AmstoreButtonRoundComponent } from "@am-front/cdk/buttons/round/round.component";
import { RouterLink } from "@angular/router";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { AuthService } from '@am-front/services/auth.service';


@Component({
    selector: "amstore-profile",
    templateUrl: "./profile.component.html",
    styleUrls: ["./profile.component.scss"],
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
    private authService: AuthService = inject(AuthService);
    private _dialog: DialogService = inject(DialogService);

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
