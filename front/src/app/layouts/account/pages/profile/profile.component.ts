import { Component } from '@angular/core';
import { Observable } from "rxjs";

import { ProfileService } from "@am/services/profile.service";
import { DialogService } from "@am/core/dialog/dialog.service";
import { IUser } from "@am/interface/profile.interface";


@Component({
    selector: 'amstore-profile-page',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {

    public user$?: Observable<IUser> = this._profile.profile$;

    constructor(
        private _profile: ProfileService,
        private _dialog: DialogService
    ) { }

    public sendVerify(): void {
        this._profile.sendVerify().subscribe((result: unknown) =>
            this._dialog.openDialog({
                maxWidth: '400px',
                data: {
                    title: 'Успешно',
                    smallTitle: 'Письмо с ссылкой успешно выслано.',
                    text: 'Для завершения регистрации проверьте почту и пройдите по ссылке из письма.'
                }
            }));
    }
}
