import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input } from '@angular/core';
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

@Component({
    selector: 'amstore-pattern-card',
    templateUrl: './pattern.component.html',
    styleUrls: ['./pattern.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        expandAnimation
    ],
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

    constructor(public elementRef: ElementRef,
                protected viewer: AmstoreViewerService,
                private changeDetector: ChangeDetectorRef,
                private profileService: ProfileService,
                private patternService: PatternService,
                private langService: LangService) {
        super(viewer);
    }

    public ngOnInit(): void {
        this.langService.lang$.pipe(takeUntil(this.destroyed))
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
