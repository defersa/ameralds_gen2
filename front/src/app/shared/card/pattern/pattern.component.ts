import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    Input
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
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

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
    public get sizeUnit(): string {
        return SIZE_UNIT[this._lang];
    }

    public get images(): ImageModelSmall[] {
        return this.data.images.length ? this.data.images : [];
    }

    public get title(): string {
        return this.data.name[this._lang];
    };

    public get categories(): IdName[] {
        return this.data.category.map((item: CategoryType) => ({id: item.id, name: item.name[this._lang]}))
    }

    @Input()
    public set data(value: IPattern) {
        this._data = value;
    };

    public get data(): IPattern {
        return this._data;
    };

    private _data: IPattern = EMPTY_PATTERN;

    private _lang: LangType = 'ru';

    protected destroyed: Subject<void> = new Subject<void>();

    protected viewer: AmstoreViewerService = inject(AmstoreViewerService);
    private changeDetector: ChangeDetectorRef = inject(ChangeDetectorRef);
    private langService: LangService = inject(LangService);
    private destroyRef: DestroyRef = inject(DestroyRef);

    public ngOnInit(): void {
        this.langService.lang$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((lang: LangType) => {
                this._lang = lang;
                this.changeDetector.markForCheck();
            });
    }

    public ngOnDestroy(): void {
        this.destroyed.next();
        this.destroyed.complete();
    }
}
