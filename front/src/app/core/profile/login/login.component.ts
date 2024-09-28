import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, inject } from "@angular/core";
import { FormGroup, ReactiveFormsModule, UntypedFormControl, UntypedFormGroup, ValidationErrors } from "@angular/forms";
import { RecaptchaDirective } from "../../recaptcha/recaptcha.directive";
import { AuthService } from "@am/services/auth.service";
import { ProfileService } from "@am/services/profile.service";
import { IAuthResponse } from "@am/interface/profile.interface";
import { MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from "@angular/material/dialog";
import { AmstoreInputComponent } from "@am/cdk/forms/input/input.component";
import { AmstoreInputPasswordComponent } from "@am/cdk/forms/input-password/input-password.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";


@Component({
    selector: "amstore-dialog-login",
    templateUrl: "./login.component.html",
    styleUrls: ["./login.component.scss"],
    standalone: true,
    imports: [
        MatDialogTitle,
        MatDialogContent,
        AmstoreInputComponent,
        ReactiveFormsModule,
        AmstoreInputPasswordComponent,
        AmstoreButtonComponent,
        MatDialogActions
    ]
})
export class AmstoreLoginComponent extends RecaptchaDirective {
    private matDialogRef: MatDialogRef<AmstoreLoginComponent> = inject(MatDialogRef<AmstoreLoginComponent>);
    private authService: AuthService = inject(AuthService);
    private profileService: ProfileService = inject(ProfileService);

    public authForm: FormGroup;
    public error: string | undefined;
    private errorName: string = 'auth';

    constructor() {
        super();

        this.authForm = new UntypedFormGroup({
            username: new UntypedFormControl('', []),
            password: new UntypedFormControl('', [])
        });

        // TODO: REWOOORK
        this.authForm.valueChanges.subscribe(() => {
            this.error = undefined;
            this.authForm.controls.username.setErrors(this._removeAuthError(this.authForm.controls.username.errors));
            this.authForm.controls.password.setErrors(this._removeAuthError(this.authForm.controls.password.errors));
        });
    }

    public login(): void {
        if (this.authForm.invalid) {
            this.authForm.markAsTouched();
            return;
        }
        this.profileService.authWithRecaptchaToken(this.authForm.value)
            .subscribe(
                (result: IAuthResponse) => {
                    if (result.access) {
                        this.authService.setToken(result);
                        this.matDialogRef.close();
                    }

                    if (result.error || !result.access) {
                        this.error = result.error || 'Неизвестная ошибка, попробуйте позже';
                    }
                },
                (error: HttpErrorResponse) => {
                    this.error = 'Неверный логин или пароль';
                    this.authForm.controls.username.setErrors({ [this.errorName]: true });
                    this.authForm.controls.password.setErrors({ [this.errorName]: true });
                    this.authForm.markAsPristine();
                }
            )
    }

    private _removeAuthError(errors: ValidationErrors | null): ValidationErrors | null {
        if (errors === null) {
            return null;
        }
        const keys: string[] = Object.keys(errors)
            .filter((key: string) => key !== this.errorName);
        return keys.length > 0 ? keys.reduce((error: ValidationErrors, key: string) => ({
            ...error,
            [key]: error[key]
        }), {}) : null;
    }

    @HostListener('keydown', ['$event'])
    private _onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.login();
        }
    }
}
