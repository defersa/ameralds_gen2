import { Component, effect, inject, input, Input, InputSignal, ViewEncapsulation } from "@angular/core";
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup, Validators } from "@angular/forms";
import { AuthService } from "@am/services/auth.service";
import { IUser } from "@am/interface/profile.interface";
import {
    AmstorePanelExpandComponent,
    AmstorePanelHeaderComponent
} from "@am/cdk/panel/panel-expand/panel-expand.component";
import { AmstoreInputComponent } from "@am/cdk/forms/input/input.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { AmstoreChipComponent } from "@am/cdk/chip/chip.component";
import { DatePipe } from "@angular/common";


@Component({
    selector: "amstore-profile-card",
    templateUrl: "./profile.component.html",
    styleUrls: ["./profile.component.scss"],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        AmstorePanelExpandComponent,
        AmstorePanelHeaderComponent,
        AmstoreInputComponent,
        ReactiveFormsModule,
        AmstoreButtonComponent,
        AmstoreChipComponent,
        DatePipe
    ],
    host: {
        class: "amstore-profile-card amstore-card-container"
    }
})
export class AmstoreProfileCardComponent {
    public user: InputSignal<IUser> = input(USER_MOCK);

    private _auth: AuthService = inject(AuthService)

    public mainFromGroup: UntypedFormGroup = new UntypedFormGroup({
        username: new UntypedFormControl({ value: '', disabled: true }, [Validators.required]),
        email: new UntypedFormControl({ value: '', disabled: true }, [Validators.required])
    });

    constructor() {
        effect(() => {
            this.mainFromGroup.setValue({
                username: this.user().username,
                email: this.user().email
            });
        });
    }

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
