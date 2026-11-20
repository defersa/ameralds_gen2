import { ChangeDetectionStrategy, Component, computed, inject, input, type InputSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import type { FullPatternEntityDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';


@Component({
    selector: 'amstore-pattern-buy-other-sizes',
    templateUrl: './pattern-buy-other-sizes.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AmstoreButtonComponent, RouterLink],
    host: { class: 'block min-w-0' },
})
export class PatternBuyOtherSizesComponent {
    public readonly pattern: InputSignal<FullPatternEntityDto> = input.required();

    private readonly authService = inject(AuthService);
    private readonly profileService = inject(ProfileService);

    /** Сравнивает размеры схемы с объединением покупок; без авторизации и до загрузки владения кнопка скрыта. */
    public readonly hasOtherSizes = computed(() => {
        if (!this.authService.auth()) {
            return false;
        }

        const pattern = this.pattern();

        const purchases = this.profileService.boughtPatterns()
            .filter((purchase) => purchase.pattern?.id === pattern.id);

        if (!purchases.length) {
            return false;
        }

        const purchasedSizeIds = new Set(purchases
            .flatMap((purchase) => purchase.sizes ?? [])
            .map((size) => size.id));

        return pattern.sizes
            .some((size) => size.size !== null && !purchasedSizeIds.has(size.id));
    });
}
