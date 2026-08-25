import { computed, inject, Injectable, Signal } from '@angular/core';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { LocalCartDto } from '@am-front/root/api-v2';
import { LocalCartService } from '@am-front/services/cart/local-cart.service';


export type CartType = 'local' | 'user' | 'admin';

@Injectable({
    providedIn: 'root'
})
export class MajorCartService {
    private authService: AuthService = inject(AuthService);
    private profileService: ProfileService = inject(ProfileService);
    private localCartService: LocalCartService = inject(LocalCartService);

    public currentCart: Signal<CartType> = computed(() => {
        if (this.profileService.isAdmin()) {
            return 'admin';
        }

        if (this.authService.auth()) {
            return 'user';
        }

        return 'local';
    });

    public price: Signal<null | LocalCartDto> = computed(() => {
        if (this.currentCart() === 'local') {
            return this.localCartService.prices();
        }

        return null;
    })

}
