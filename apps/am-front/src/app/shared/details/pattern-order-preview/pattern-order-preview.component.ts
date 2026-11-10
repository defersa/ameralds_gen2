import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { AmstoreChipComponent } from '@am-front/cdk/chip/chip.component';
import { PurchasedOrderPatternDto, UserOrderDetailsDto } from '@am-front/root/api-v2';
import { CategoriesService } from '@am-front/services/categories.service';


@Component({
    selector: 'amstore-pattern-order-preview',
    templateUrl: './pattern-order-preview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AmstoreChipComponent, MatIcon, DecimalPipe],
})
export class PatternOrderPreviewComponent {
    private readonly categoriesService = inject(CategoriesService);

    public readonly item = input.required<PurchasedOrderPatternDto>();
    public readonly currency = input.required<UserOrderDetailsDto['currency']>();

    public readonly categories = computed(() => {
        const byId = this.categoriesService.categoriesById();

        return (this.item().categories ?? [])
            .map((id) => byId[id])
            .filter((category) => Boolean(category));
    });
}
