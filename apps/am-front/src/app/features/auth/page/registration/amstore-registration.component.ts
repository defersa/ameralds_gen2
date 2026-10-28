import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, UntypedFormGroup, Validators } from "@angular/forms";
import { CustomValidatorFns } from "@am-front/cdk/forms/custom-validators-fn";
import { ProfileService } from "@am-front/services/profile.service";
import { DialogService } from "@am-front/core/dialog/dialog.service";
import { Router } from "@angular/router";
import { AmstorePanelBasicComponent } from "@am-front/cdk/panel/panel-basic/amstore-panel-basic.component";
import { AmstoreInputComponent } from "@am-front/cdk/forms/input/input.component";
import { AmstoreInputPasswordComponent } from "@am-front/cdk/forms/input-password/input-password.component";
import { AmstoreCheckboxComponent } from "@am-front/cdk/forms/checkbox/checkbox.component";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { finalize } from "rxjs/operators";
import { SnackService } from '@am-front/services/snackbar.service';


@Component({
    selector: 'amstore-registration',
    templateUrl: './amstore-registration.component.html',
    styleUrls: ['./amstore-registration.component.scss'],
    imports: [
        AmstorePanelBasicComponent,
        AmstoreInputComponent,
        ReactiveFormsModule,
        AmstoreInputPasswordComponent,
        AmstoreCheckboxComponent,
        AmstoreButtonComponent,
    ],
})
export class AmstoreRegistrationComponent {
    private _profileService: ProfileService = inject(ProfileService);
    private _dialogService: DialogService = inject(DialogService);
    private _router: Router = inject(Router);
    private _snackService: SnackService = inject(SnackService);
    private readonly destroyRef = inject(DestroyRef);

    public regForm: UntypedFormGroup;
    public isAccept: FormControl = new FormControl(false);
    public readonly pending = signal(false);

    constructor() {
        const passwordControl: FormControl = new FormControl(null, [
            CustomValidatorFns.getPasswordComplexity,
        ]);
        this.regForm = new UntypedFormGroup({
            email: new FormControl(null, [CustomValidatorFns.isEmail, Validators.maxLength(254)]),
            password: passwordControl,
            passwordRepeat: new FormControl(null, [
                CustomValidatorFns.getEqualPassword(passwordControl),
            ]),
            firstName: new FormControl(),
            lastName: new FormControl(),
        });
    }

    public sendUser(): void {
        if (this.pending() || !this.isAccept.value) return;
        if (this.regForm.invalid) {
            this.regForm.markAllAsTouched();

            return;
        }

        this.pending.set(true);
        const { email, password } = this.regForm.value;
        this._profileService
            .createUser({ email: email.trim().toLowerCase(), password })
            .pipe(
                finalize(() => this.pending.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: () => {
                    const showInstructions = () => this._dialogService.openInfoDialog({
                        minWidth: '0', width: '440px', maxWidth: 'calc(100vw - 32px)',
                        data: {
                            title: 'Проверьте почту',
                            smallTitle: 'Запрос принят.',
                            text: 'Если для указанного адреса доступна регистрация или вход, на него придёт письмо с дальнейшими действиями. Ссылка действует 7 дней.',
                        },
                    });
                    // Переход уничтожает форму: показ общего диалога не должен
                    // отменяться takeUntilDestroyed вместе с подпиской формы.
                    void this._router.navigate(['/']).then(showInstructions, showInstructions);
                },
                error: (error: HttpErrorResponse) => {
                    this._snackService.open(error.status === 429
                        ? 'Слишком много попыток. Попробуйте позже'
                        : 'Не удалось принять запрос. Проверьте данные и попробуйте позже');
                },
            });
    }
}
