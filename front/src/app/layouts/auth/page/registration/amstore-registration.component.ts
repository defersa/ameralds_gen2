import { Component, inject } from "@angular/core";
import { FormControl, ReactiveFormsModule, UntypedFormGroup } from "@angular/forms";
import { CustomValidatorFns } from "@am/cdk/forms/custom-validators-fn";
import { ProfileService } from "@am/services/profile.service";
import { DialogService } from "@am/core/dialog/dialog.service";
import { fromPromise } from "rxjs/internal-compatibility";
import { Router } from "@angular/router";
import { UserCredentialsDto } from "@am/root/api";
import { AmstorePanelBasicComponent } from "@am/cdk/panel/panel-basic/amstore-panel-basic.component";
import { AmstoreInputComponent } from "@am/cdk/forms/input/input.component";
import { AmstoreInputPasswordComponent } from "@am/cdk/forms/input-password/input-password.component";
import { AmstoreCheckboxComponent } from "@am/cdk/forms/checkbox/checkbox.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { switchMap } from "rxjs/operators";


@Component({
    selector: "amstore-registration",
    templateUrl: "./amstore-registration.component.html",
    styleUrls: ["./amstore-registration.component.scss"],
    imports: [
        AmstorePanelBasicComponent,
        AmstoreInputComponent,
        ReactiveFormsModule,
        AmstoreInputPasswordComponent,
        AmstoreCheckboxComponent,
        AmstoreButtonComponent
    ]
})
export class AmstoreRegistrationComponent {
    private _profileService: ProfileService = inject(ProfileService);
    private _dialogService: DialogService = inject(DialogService);
    private _router: Router = inject(Router);

    public regForm: UntypedFormGroup;
    public isAccept: FormControl = new FormControl(false);

    constructor(
    ) {
        const passwordControl: FormControl = new FormControl(null, [CustomValidatorFns.getPasswordComplexity]);
        this.regForm = new UntypedFormGroup({
            email: new FormControl(null, [CustomValidatorFns.isEmail]),
            password: passwordControl,
            passwordRepeat: new FormControl(null, [CustomValidatorFns.getEqualPassword(passwordControl)]),
            firstName: new FormControl(),
            lastName: new FormControl()
        });

    }

    public sendUser(): void {
        if (this.regForm.invalid) {
            return;
        }

        this._profileService.createUser(this.regForm.value as UserCredentialsDto)
            .pipe(
                switchMap(() => fromPromise(this._router.navigate(["/"]))),
            )
            .subscribe({
                next: () => {
                    this._dialogService.openInfoDialog({
                        maxWidth: "400px",
                        data: {
                            title: "Успешно",
                            smallTitle: "Профиль успешно создан.",
                            text: "Для завершения регистрации требуется подтвердить аккаунт. Вам на почту выслано письмо с ссылкой на страницу с подтверждением аккаунта."
                        }
                    });
                },
                error: () => null,
            });
        // formAsyncErrorHandler(
        //     this.regForm,
        //     this._profileService.postNewUser(this.regForm.value as UserCredentialsDto)
        // ).subscribe((response: string) => {
        //     fromPromise(this._router.navigate(['/']))
        //         .subscribe(() =>
        //             this._dialogService.openDialog({
        //                 maxWidth: '400px',
        //                 data: {
        //                     title: 'Успешно',
        //                     smallTitle: 'Профиль успешно создан.',
        //                     text: 'Для завершения регистрации требуется подтвердить аккаунт. Вам на почту выслано письмо с ссылкой на страницу с подтверждением аккаунта.'
        //                 }
        //             }));
        // }, () => {
        // });
    }
}
