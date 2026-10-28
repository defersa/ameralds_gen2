import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { AmstorePanelExpandComponent, AmstorePanelHeaderComponent } from '@am-front/cdk/panel/panel-expand/panel-expand.component';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { AmstoreProfileCardComponent } from '@am-front/shared/card/profile/profile.component';
import { loadingHandler } from '@am-front/root/utils/loading-with';

@Component({
    selector: 'amstore-profile-page',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AmstoreProfileCardComponent,
        AmstorePanelExpandComponent,
        AmstorePanelHeaderComponent,
        AmstoreButtonComponent,
    ],
    host: { class: 'block w-full max-w-150 mx-auto px-4 sm:px-0' },
})
export class ProfileComponent {
    private readonly profileService = inject(ProfileService);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly auth = inject(AuthService).auth;
    protected readonly user = toSignal(this.profileService.user$, { requireSync: true });
    protected readonly loading = signal(false);

    constructor() {
        this.loadProfile();
    }

    protected loadProfile(): void {
        if (!this.auth()) {
            return;
        }

        this.profileService.loadProfile().pipe(
            loadingHandler(this.loading),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe();
    }
}
