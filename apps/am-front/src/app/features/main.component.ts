import { Component, computed, inject, Signal } from '@angular/core';
import { MenuComponent, MenuSection } from '@am-front/shared/menu/menu.component';
import { RouterOutlet } from '@angular/router';
import { ProfileService } from '@am-front/services/profile.service';
import { AuthService } from '@am-front/services/auth.service';
import { PROFILE_ROUTES_SECTION } from '@am-front/root/features/main/account/account.routes';
import { BASE_ROUTES_SECTION } from '@am-front/root/features/main/store/store.routes';
import { ADMIN_ROUTES_SECTION } from '@am-front/root/features/main/admin/admin.routes';


@Component({
    selector: 'amstore-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.scss'],
    host: {
        class: 'grid'
    },
    imports: [
        MenuComponent,
        RouterOutlet,
    ],
})
export class MainComponent {
    private profileService: ProfileService = inject(ProfileService);
    private authService: AuthService = inject(AuthService);

    protected readonly sections: Signal<MenuSection[]> = computed(() => {
        return [
            BASE_ROUTES_SECTION,
            this.authService.auth() ? PROFILE_ROUTES_SECTION : null,
            this.profileService.isAdmin() ? ADMIN_ROUTES_SECTION : null,
        ].filter(Boolean);
    });
}
