import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component, computed,
    DestroyRef,
    ElementRef,
    inject, input,
    Input, InputSignal, Signal
} from "@angular/core";
import { UntypedFormControl } from '@angular/forms';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { expandAnimation } from '@am/cdk/animations/expand';
import { ThemePalette } from '@am/cdk/core/color';
import { AmstoreViewerService } from '@am/shared/viewer/viewer.service';

import { LangService } from '@am/services/lang.service';
import { ProfileService } from '@am/services/profile.service';


import { ImageModelSmall } from '@am/interface/image.interface';
import { IPattern } from '@am/interface/pattern.interface';
import { IdName } from '@am/interface/request.interface';
import { LangType } from '@am/interface/lang.interface';

import { AmstoreCardDirective } from '../card.directive';
import { CategoryType } from '@am/interface/category.interface';
import { SIZE_UNIT } from "@am/utils/constants";
import { PatternService } from "@am/services/pattern.service";
import { EMPTY_PATTERN } from "@am/shared/mocks/pattern";
import { ImageListComponent } from "@am/shared/image-list/image-list.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { AmstoreChipComponent } from "@am/cdk/chip/chip.component";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import type { ImageDto, PatternEntityDto } from "@am/root/api";
import { CategoriesService } from "@am/services/categories.service";
import { OptionType } from "@am/interface/cdk.interface";


@Component({
    selector: "amstore-pattern-card",
    templateUrl: "./pattern.component.html",
    styleUrls: ["./pattern.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
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
    protected viewer: AmstoreViewerService = inject(AmstoreViewerService);
    private categoriesService: CategoriesService = inject(CategoriesService);
    private langService: LangService = inject(LangService);

    public pattern: InputSignal<PatternEntityDto> = input();

    public lang: Signal<LangType> = toSignal(this.langService.lang$);
    public categoriesById: Signal<Record<number, OptionType>> = toSignal(this.categoriesService.categoriesById$);
    public categories: Signal<OptionType[]> = computed(() => {
        const categoriesById: Record<number, OptionType> = this.categoriesById();
        const pattern: PatternEntityDto = this.pattern();

        return pattern.categories
            .map((category: number) => categoriesById[category])
            .filter(Boolean);
    });

    public images: Signal<ImageDto[]> = computed(() => this.pattern().images);
    public title: Signal<string> = computed(() => {
        const pattern: PatternEntityDto = this.pattern();
        const lang: LangType = this.lang();

        return pattern.name[lang];
    });
}
