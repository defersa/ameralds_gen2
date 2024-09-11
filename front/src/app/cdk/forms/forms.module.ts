import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyRadioModule as MatRadioModule } from "@angular/material/legacy-radio";

import { AmstoreChipModule } from '../chip/chip.module';
import { AmstoreIconModule } from '../icons/icons.module';

import { AmstoreInputComponent } from './input/input.component';
import { AmstoreFormLabel } from './forms.abstract.directive';
import { AmstoreCheckboxComponent } from './checkbox/checkbox.component';
import { AmstoreSelectComponent } from './select/select.component';
import { AmstoreButtonDefaultModule } from '../buttons/default/default.module';
import { AmstoreFormArrayComponent } from './array/array.component';
import { AmstoreUploadFileComponent } from './upload-file/upload-file.component';
import { AmstoreChipsCheckboxComponent } from './chips-checkbox/chips-checkbox.component';
import { AmstoreInputPasswordComponent } from './input-password/input-password.component';
import { AmstoreDataRangePickerComponent } from "@am/cdk/forms/data-range-picker/amstore-data-range-picker.component";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";

const FORM_COMPONENT: any[] = [
    AmstoreInputComponent,
    AmstoreFormLabel,
    AmstoreCheckboxComponent,
    AmstoreSelectComponent,
    AmstoreFormArrayComponent,
    AmstoreUploadFileComponent,
    AmstoreChipsCheckboxComponent,
    AmstoreInputPasswordComponent,
    AmstoreDataRangePickerComponent,
];


@NgModule({
    declarations: FORM_COMPONENT,
    exports: FORM_COMPONENT,
    imports: [
        CommonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        ReactiveFormsModule,
        FormsModule,
        AmstoreButtonDefaultModule,
        AmstoreIconModule,
        AmstoreChipModule,
        MatRadioModule,
        MatDatepickerModule,
        MatNativeDateModule,
    ]
})
export class AmstoreFormsModule {
}
