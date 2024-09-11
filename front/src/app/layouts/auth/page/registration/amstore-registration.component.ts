import { Component, OnInit } from "@angular/core";
import { FormControl, UntypedFormControl, UntypedFormGroup } from "@angular/forms";
import { CustomValidatorFns } from "@am/cdk/forms/custom-validators-fn";
import { ProfileService } from "@am/services/profile.service";
import { formAsyncErrorHandler } from "@am/cdk/forms/form-async-error.handler";
import { AuthRegistrationRequest } from "@am/interface/request/auth-request.interface";
import { DialogService } from "@am/core/dialog/dialog.service";
import { fromPromise } from "rxjs/internal-compatibility";
import { Router } from "@angular/router";
import { UserCredentialsDto, UserTokensDTO } from "@am/root/api";
import { error } from "protractor";


@Component({
    selector: "amstore-registration",
    templateUrl: "./amstore-registration.component.html",
    styleUrls: ["./amstore-registration.component.scss"]
})
export class AmstoreRegistrationComponent {

    public regForm: UntypedFormGroup;
    public isAccept: FormControl = new FormControl(false);

    constructor(
        private _profileService: ProfileService,
        private _dialogService: DialogService,
        private _router: Router
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

        this._profileService.postNewUser(this.regForm.value as UserCredentialsDto)
            .subscribe({
                next: (response: string) => {
                    fromPromise(this._router.navigate(["/"]))
                        .subscribe(() =>
                            this._dialogService.openDialog({
                                maxWidth: "400px",
                                data: {
                                    title: "Успешно",
                                    smallTitle: "Профиль успешно создан.",
                                    text: "Для завершения регистрации требуется подтвердить аккаунт. Вам на почту выслано письмо с ссылкой на страницу с подтверждением аккаунта."
                                }
                            }));
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
