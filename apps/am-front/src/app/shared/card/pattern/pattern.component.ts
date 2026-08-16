import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    InputSignal, Signal
} from "@angular/core";

import { expandAnimation } from "@am-front/cdk/animations/expand";
import { AmstoreViewerService } from "@am-front/shared/viewer/viewer.service";
import { LangService } from "@am-front/services/lang.service";
import { LangType } from "@am-front/interface/lang.interface";

import { AmstoreCardDirective } from '../card.directive';
import { ImageListComponent } from "@am-front/shared/image-list/image-list.component";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { AmstoreChipComponent } from "@am-front/cdk/chip/chip.component";
import { toSignal } from "@angular/core/rxjs-interop";
import { FullPatternEntityDto, ImageDto, PatternEntityDto } from "@am-front/root/api-v2";
import { CategoriesService } from "@am-front/services/categories.service";
import { OptionType } from "@am-front/interface/cdk.interface";


@Component({
    selector: "amstore-pattern-card",
    templateUrl: "./pattern.component.html",
    styleUrls: ["./pattern.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        expandAnimation
    ],
    imports: [
        ImageListComponent,
        IconsComponent,
        AmstoreChipComponent
    ]
})
export class AmstorePatternCardComponent extends AmstoreCardDirective {
    protected override viewer: AmstoreViewerService = inject(AmstoreViewerService);
    private categoriesService: CategoriesService = inject(CategoriesService);
    private langService: LangService = inject(LangService);

    public pattern: InputSignal<FullPatternEntityDto> = input();

    public lang: Signal<LangType> = this.langService.lang;
    public categoriesById: Signal<Record<number, OptionType>> = toSignal(this.categoriesService.categoriesById$);
    public categories: Signal<OptionType[]> = computed(() => {
        const categoriesById: Record<number, OptionType> = this.categoriesById();
        const pattern: FullPatternEntityDto = this.pattern();

        if (!categoriesById) {
            return [];
        }

        return pattern.categories
            .map((category: number) => categoriesById[category])
            .filter(Boolean);
    });

    public images: Signal<ImageDto[]> = computed(() => this.pattern().images);
    public title: Signal<string> = computed(() => {
        const pattern: FullPatternEntityDto = this.pattern();
        const lang: LangType = this.lang();

        return pattern.name[lang];
    });
}
