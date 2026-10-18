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
import { FullPatternEntityDto, ImageDto } from "@am-front/root/api-v2";


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
        IconsComponent
    ]
})
export class AmstorePatternCardComponent extends AmstoreCardDirective {
    protected override viewer: AmstoreViewerService = inject(AmstoreViewerService);
    private langService: LangService = inject(LangService);

    public pattern: InputSignal<FullPatternEntityDto> = input();

    public lang: Signal<LangType> = this.langService.lang;
    public images: Signal<ImageDto[]> = computed(() => this.pattern().images);
    public title: Signal<string> = computed(() => {
        const pattern: FullPatternEntityDto = this.pattern();
        const lang: LangType = this.lang();

        return pattern.name[lang];
    });
}
