import { Component, computed, inject, input, InputSignal, Signal } from "@angular/core";
import { LangType } from "@am-front/interface/lang.interface";
import { expandAnimation } from "@am-front/cdk/animations/expand";
import { AmstoreChipComponent } from "@am-front/cdk/chip/chip.component";
import type { PatternEntityDto } from "@am-front/root/api-v2";
import { toSignal } from "@angular/core/rxjs-interop";
import { OptionType } from "@am-front/interface/cdk.interface";
import { LangService } from "@am-front/services/lang.service";
import { CategoriesService } from "@am-front/services/categories.service";


@Component({
    selector: "amstore-pattern-details-short",
    templateUrl: "./short.component.html",
    styleUrls: ["./short.component.scss"],
    animations: [
        expandAnimation
    ],
    imports: [
        AmstoreChipComponent,
    ]
})
export class ShortPatternDetailsComponent {
    public pattern: InputSignal<PatternEntityDto> = input();
    public routerLink: InputSignal<(string | number)[]> = input();

    private langService: LangService = inject(LangService)
    private categoriesService: CategoriesService = inject(CategoriesService);

    public lang: Signal<LangType> = this.langService.lang;
    public categoriesById: Signal<Record<number, OptionType>> = toSignal(this.categoriesService.categoriesById$);
    public categories: Signal<OptionType[]> = computed(() => {
        const categoriesById: Record<number, OptionType> = this.categoriesById();
        const pattern: PatternEntityDto = this.pattern();

        return pattern.categories
            .map((category: number) => categoriesById[category])
            .filter(Boolean);
    });
}
