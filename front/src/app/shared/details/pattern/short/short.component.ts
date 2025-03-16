import { Component, computed, inject, input, Input, InputSignal, Signal } from "@angular/core";
import { IPattern } from "@am/interface/pattern.interface";
import { ILangText, LangType } from "@am/interface/lang.interface";
import { MONEY_UNIT } from "@am/utils/constants";
import { expandAnimation } from "@am/cdk/animations/expand";
import { AmstoreChipComponent } from "@am/cdk/chip/chip.component";
import { AmstoreInfoComponent } from "@am/cdk/info/info.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { RouterLink } from "@angular/router";
import { LangTextComponent } from "@am/shared/lang-text/lang-text.component";
import { LangNumberComponent } from "@am/shared/lang-text/lang-number.component";
import type { PatternEntityDto } from "@am/root/api";
import { toSignal } from "@angular/core/rxjs-interop";
import { OptionType } from "@am/interface/cdk.interface";
import { LangService } from "@am/services/lang.service";
import { CategoriesService } from "@am/services/categories.service";


@Component({
    selector: "amstore-pattern-details-short",
    templateUrl: "./short.component.html",
    styleUrls: ["./short.component.scss"],
    animations: [
        expandAnimation
    ],
    imports: [
        AmstoreChipComponent,
        AmstoreInfoComponent,
        AmstoreButtonComponent,
        IconsComponent,
        RouterLink,
        LangTextComponent,
        LangNumberComponent
    ]
})
export class ShortPatternDetailsComponent {
    public pattern: InputSignal<PatternEntityDto> = input();
    public routerLink: InputSignal<(string | number)[]> = input();

    private langService: LangService = inject(LangService)
    private categoriesService: CategoriesService = inject(CategoriesService);

    public lang: Signal<LangType> = toSignal(this.langService.lang$);
    public categoriesById: Signal<Record<number, OptionType>> = toSignal(this.categoriesService.categoriesById$);
    public categories: Signal<OptionType[]> = computed(() => {
        const categoriesById: Record<number, OptionType> = this.categoriesById();
        const pattern: PatternEntityDto = this.pattern();

        return pattern.categories
            .map((category: number) => categoriesById[category])
            .filter(Boolean);
    });
}
