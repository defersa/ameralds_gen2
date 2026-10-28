import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { RecaptchaDirective } from '../../recaptcha/recaptcha.directive';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { AmstoreInputComponent } from '@am-front/cdk/forms/input/input.component';
import { AmstoreInputPasswordComponent } from '@am-front/cdk/forms/input-password/input-password.component';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { IconsComponent } from '@am-front/cdk/icons/icons.component';

interface LoginDialogData {
    emailLogin?: boolean;
    redirectPath?: string;
}

@Component({
    selector: 'amstore-dialog-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatDialogTitle, MatDialogContent, MatDialogActions, AmstoreInputComponent, ReactiveFormsModule,
        AmstoreInputPasswordComponent, AmstoreButtonComponent, IconsComponent],
})
export class AmstoreLoginComponent extends RecaptchaDirective {
    private readonly matDialogRef = inject(MatDialogRef<AmstoreLoginComponent>);
    private readonly authService = inject(AuthService);
    private readonly profileService = inject(ProfileService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly data = inject<LoginDialogData>(MAT_DIALOG_DATA, { optional: true });

    public readonly mode = signal<'password' | 'email'>('password');
    public readonly pending = signal(false);
    public readonly requested = signal(false);
    public readonly error = signal<string | null>(null);
    public readonly authForm = new FormGroup({
        email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(254)] }),
        password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    });

    constructor() {
        super();
        if (this.data?.emailLogin) this.switchMode('email');
        this.authForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.error.set(null);
            this.requested.set(false);
        });
    }

    public switchMode(mode: 'password' | 'email'): void {
        if (this.pending()) return;
        this.mode.set(mode);
        this.error.set(null);
        this.requested.set(false);
        if (mode === 'email') this.authForm.controls.password.disable();
        else this.authForm.controls.password.enable();
    }

    public login(): void {
        if (this.pending()) return;
        if (this.authForm.invalid) {
            this.authForm.markAllAsTouched();
            return;
        }
        this.pending.set(true);
        this.error.set(null);
        const email = this.authForm.controls.email.value.trim().toLowerCase();
        if (this.mode() === 'email') {
            this.authService.requestEmailLogin(email, this.data?.redirectPath).pipe(
                finalize(() => this.pending.set(false)), takeUntilDestroyed(this.destroyRef),
            ).subscribe({
                next: () => this.requested.set(true),
                error: (error: HttpErrorResponse) => this.error.set(error.status === 429
                    ? 'Слишком много попыток. Попробуйте позже'
                    : 'Не удалось принять запрос. Попробуйте ещё раз позже'),
            });
        } else {
            this.profileService.authUser({ email, password: this.authForm.controls.password.value }).pipe(
                finalize(() => this.pending.set(false)), takeUntilDestroyed(this.destroyRef),
            ).subscribe({
                next: result => {
                    this.authService.setToken(result);
                    this.matDialogRef.close();
                },
                error: (error: HttpErrorResponse) => this.error.set(error.status === 429
                    ? 'Слишком много попыток. Попробуйте позже' : 'Неверный логин или пароль'),
            });
        }
    }

    public close(): void {
        this.matDialogRef.close();
    }

    @HostListener('keydown', ['$event'])
    protected onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.isComposing && event.target instanceof HTMLInputElement) {
            event.preventDefault();
            this.login();
        }
    }
}
