import { Component, inject } from "@angular/core";

import { ProfileService } from "@am/services/profile.service";
import { DialogService } from "@am/core/dialog/dialog.service";


@Component({
    selector: "amstore-profile-page",
    templateUrl: "./profile.component.html",
    styleUrls: ["./profile.component.scss"],
})
export class ProfileComponent {
    private profile: ProfileService = inject(ProfileService);
    private dialog: DialogService = inject(DialogService);

    // public user$?: Observable<IUser> = this.profile.profile$;

    public sendVerify(): void {
        this.profile.sendVerify()
            .subscribe((result: unknown) =>
                this.dialog.openInfoDialog({
                    maxWidth: "400px",
                    data: {
                        title: "Успешно",
                        smallTitle: "Письмо с ссылкой успешно выслано.",
                        text: "Для завершения регистрации проверьте почту и пройдите по ссылке из письма."
                    }
                }));
    }
}
