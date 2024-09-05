import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup } from "@angular/forms";
import { Observable } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { SizesService } from "@am/services/sizes.service";
import { CategoriesService } from "@am/services/categories.service";
import { LangService } from "@am/services/lang.service";
import { OptionType } from "@am/interface/cdk.interface";
import { DestroyService } from "@am/utils/destroy.service";
import { ThemePalette } from "@am/cdk/core/color";
import { AbstractFilterComponent } from "@am/shared/filters/filter.abstract";


@Component({
    selector: 'amstore-filters',
    templateUrl: './filter.component.html',
    styleUrls: ['./filter.component.scss'],
    providers: [DestroyService],
    host: {
        class: 'amstore-filters'
    }
})
export class AmstoreFilterComponent extends AbstractFilterComponent {
    public categoriesList$: Observable<OptionType[]> = this._categoriesService.categoriesList$;
    public sizesList$: Observable<OptionType[]> = this._sizeService.sizesList$;

    public filterForm: FormGroup = new FormGroup({
            search: new FormControl(),
            categories: new FormControl(),
            sizes: new FormControl()
        });

    constructor(
        private _langService: LangService,
        private _sizeService: SizesService,
        private _categoriesService: CategoriesService,
    ) {
        super();
    }
}


