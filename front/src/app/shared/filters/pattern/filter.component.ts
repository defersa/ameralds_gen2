import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { Observable } from "rxjs";

import { SizesService } from "@am/services/sizes.service";
import { CategoriesService } from "@am/services/categories.service";
import { OptionType } from "@am/interface/cdk.interface";
import { AbstractFilterComponent } from "@am/shared/filters/filter.abstract";
import {
    AmstorePanelExpandComponent,
    AmstorePanelHeaderComponent
} from "@am/cdk/panel/panel-expand/panel-expand.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { AmstoreInputComponent } from "@am/cdk/forms/input/input.component";
import { AmstoreChipsCheckboxComponent } from "@am/cdk/forms/chips-checkbox/chips-checkbox.component";
import { AsyncPipe } from "@angular/common";


@Component({
    selector: "amstore-filters",
    templateUrl: "./filter.component.html",
    styleUrls: ["./filter.component.scss"],
    imports: [
        AmstorePanelExpandComponent,
        AmstorePanelHeaderComponent,
        AmstoreButtonComponent,
        IconsComponent,
        AmstoreInputComponent,
        AmstoreChipsCheckboxComponent,
        AsyncPipe,
        ReactiveFormsModule
    ],
    host: {
        class: "amstore-filters"
    }
})
export class AmstoreFilterComponent extends AbstractFilterComponent {
    private sizeService: SizesService = inject(SizesService);
    private categoriesService: CategoriesService = inject(CategoriesService);

    public categoriesList$: Observable<OptionType[]> = this.categoriesService.categoriesList$;
    public sizesList$: Observable<OptionType[]> = this.sizeService.list$;

    public filterForm: FormGroup = new FormGroup({
            search: new FormControl(),
            categories: new FormControl(),
            sizes: new FormControl()
        });
}


