import { Component, Input, ViewEncapsulation } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from "@angular/forms";
import { AuthService } from "@am/services/auth.service";
import { IUser } from "@am/interface/profile.interface";


@Component({
    selector: 'amstore-profile-card',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'amstore-profile-card amstore-card-container'
    }
})
export class AmstoreProfileCardComponent {
    @Input()
    public set user(value: IUser) {
        this._user = value;
        this.mainFromGroup.setValue({
            username: value.username,
            email: value.email
        })
    }
    public get user(): IUser { return this._user; }
    private _user: IUser = USER_MOCK;

    public mainFromGroup: UntypedFormGroup = new UntypedFormGroup({
        username: new UntypedFormControl({ value: '', disabled: true }, [Validators.required]),
        email: new UntypedFormControl({ value: '', disabled: true }, [Validators.required])
    });

    constructor(private _auth: AuthService) { }


    public logout(): void {
        this._auth.logout();
    }

}

const USER_MOCK: IUser = {
    id: 0,
    username: '',
    email: '',
    date_joined: '',
    is_staff: false,
    person: {
        verify: false,
        location: 'ru'
    }
}
