import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { AmstoreChipComponent } from "@am-front/cdk/chip/chip.component";
import { OptionType } from "@am-front/interface/cdk.interface";
import { FullPatternEntityDto } from "@am-front/root/api-v2";
import { CategoriesService } from "@am-front/services/categories.service";


@Component({
    selector: "amstore-pattern-common",
    templateUrl: "./pattern-common.component.html",
    styleUrls: ["./pattern-common.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AmstoreChipComponent]
})
export class PatternCommonComponent {
    public readonly pattern: InputSignal<FullPatternEntityDto> = input.required();

    private readonly categoriesService: CategoriesService = inject(CategoriesService);

    public readonly categories: Signal<OptionType[]> = computed(() => {
        const categoriesById: Record<number, OptionType> = this.categoriesService.categoriesById();
        const pattern: FullPatternEntityDto = this.pattern();

        if (!categoriesById) {
            return [];
        }

        return pattern.categories
            .map((category: number) => categoriesById[category])
            .filter(Boolean);
    });
}
