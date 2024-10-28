import { ChangeDetectionStrategy, Component, inject, input, InputSignal, OnInit } from "@angular/core";
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { FormGroupPipe } from "@am/shared/pipes/form-group.pipe";
import { AmstoreSelectComponent } from "@am/cdk/forms/select/select.component";
import { AsyncPipe } from "@angular/common";
import { SizesService } from "@am/services/sizes.service";
import { Observable } from "rxjs";
import { OptionType } from "@am/interface/cdk.interface";
import { AmstoreUploadComponent } from "@am/cdk/forms/upload/upload.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { AmstoreInputComponent } from "@am/cdk/forms/input/input.component";


@Component({
    selector: "amstore-pattern-sizes",
    templateUrl: "./pattern-sizes.component.html",
    styleUrls: ["./pattern-sizes.component.scss"],
    standalone: true,
    imports: [
        ReactiveFormsModule,
        FormGroupPipe,
        AmstoreSelectComponent,
        AsyncPipe,
        AmstoreUploadComponent,
        AmstoreButtonComponent,
        IconsComponent,
        AmstoreInputComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AmstorePatternSizesComponent {
    public formArray: InputSignal<FormArray> = input();

    private sizeService: SizesService = inject(SizesService);

    public sizesList$: Observable<OptionType[]> = this.sizeService.sizesList$;

    public addSize(): void {
        this.formArray().push(new FormGroup({
            id: new FormControl({ value: null, disabled: true }),
            size: new FormControl(null),
            cbb: new FormControl(null),
            jbb: new FormControl(null),
            png: new FormControl(null),
            pdf: new FormControl(null),
        }));
    }

    public deleteSize(index: number): void {
        const needWarning: boolean = Boolean(this.formArray().at(index).get('id').value);


        this.formArray().removeAt(index);
    }
}
