import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { DialogService } from '@am-front/core/dialog/dialog.service';
import { AmstoreLoginComponent } from '@am-front/core/profile/login/login.component';
import { AuthService } from '@am-front/services/auth.service';


@Component({
    selector: 'amstore-email-login',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AmstoreButtonComponent, RouterLink],
    template: `
        <main class="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
            @if (failed()) {
                <h1>
                    Не удалось войти по ссылке
                </h1>

                <p role="alert">
                    Ссылка недействительна, уже использована или срок её действия истёк.
                </p>

                <p>
                    Если вы подтверждали регистрацию, заполните форму повторно — отправим новое письмо подтверждения.
                </p>

                <a routerLink="/auth/registration">
                    Повторить регистрацию
                </a>

                <p>
                    Если аккаунт уже создан, запросите новую ссылку для входа.
                </p>

                <button amstore-button type="button" color="accent" (click)="requestLoginLink()">
                    Получить ссылку входа
                </button>

                <a routerLink="/">
                    На главную
                </a>
            }

            @else {
                <h1>
                    Входим в аккаунт…
                </h1>

                <p role="status">
                    Подождите, сейчас откроется нужная страница.
                </p>
            }
        </main>
    `,
})
export class EmailLoginComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private readonly route = inject(ActivatedRoute);
    private readonly dialog = inject(DialogService);
    private readonly destroyRef = inject(DestroyRef);
    public readonly failed = signal(false);

    /** Обменивает токен из fragment на сессию, удаляет его из адреса и показывает варианты повтора при ошибке. */
    constructor() {
        const token = new URLSearchParams(this.route.snapshot.fragment ?? '').get('token');

        this.location.replaceState('/auth/email');

        if (!token) {
            this.failed.set(true);
            return;
        }

        this.auth.signInWithEmailLink(token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: destination => {
                void this.router.navigateByUrl(destination, { replaceUrl: true }).then(opened => {
                    if (!opened) {
                        this.failed.set(true);
                    }
                }).catch(() => this.failed.set(true));
            },
            error: () => this.failed.set(true),
        });
    }

    /** Открывает запрос ссылки входа для уже созданного аккаунта; подтверждение повторяют через регистрацию. */
    public requestLoginLink(): void {
        this.dialog.openCustomDialog(AmstoreLoginComponent, {
            data: {
                emailLogin: true,
            },
            minWidth: '0',
            width: '440px',
            maxWidth: 'calc(100vw - 32px)',
        });
    }
}
