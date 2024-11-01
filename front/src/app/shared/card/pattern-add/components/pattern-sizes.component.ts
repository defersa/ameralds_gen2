import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    input,
    InputSignal,
    OnInit
} from "@angular/core";
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
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
import type { PatternSizeDto } from "@am/root/api";


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
    private _changeDetector: ChangeDetectorRef = inject(ChangeDetectorRef);

    public sizesList$: Observable<OptionType[]> = this.sizeService.sizesList$;

    public addSize(size: Partial<PatternSizeDto> = {}): void {
        this.formArray().push(new FormGroup({
            id: new FormControl({ value: size.id ?? null, disabled: true }),
            size: new FormControl(
                {
                    value: (size.size as unknown as Record<string, number>)?.id ?? null,
                    disabled: Boolean(size.id),
                },
                Validators.required),
            cbb: new FormControl(size.cbb ?? null, Validators.required),
            jbb: new FormControl(size.jbb ?? null, Validators.required),
            png: new FormControl(size.png ?? null, Validators.required),
            pdf: new FormControl(size.pdf ?? null, Validators.required),
        }));
    }

    public setSizes(sizes: PatternSizeDto[]): void {
        this.formArray().clear();

        sizes.forEach((size: PatternSizeDto) => this.addSize(size));

        this._changeDetector.markForCheck();
    }

    public deleteSize(index: number): void {
        const needWarning: boolean = Boolean(this.formArray().at(index).get('id').value);

        this.formArray().removeAt(index);
    }
}
