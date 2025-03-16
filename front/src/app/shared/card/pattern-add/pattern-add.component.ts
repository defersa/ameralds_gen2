import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    effect,
    inject,
    input,
    InputSignal,
    output,
    OutputEmitterRef,
    Signal,
    viewChild
} from "@angular/core";
import { Observable } from 'rxjs';
import { filter } from "rxjs/operators";

import { OptionType } from '@am/interface/cdk.interface';
import {
    FormArray,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators
} from "@angular/forms";
import { CategoriesService } from '@am/services/categories.service';

import { AmstoreCardDirective } from '../card.directive';
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { AmstoreInputComponent } from "@am/cdk/forms/input/input.component";
import { AmstoreCheckboxComponent } from "@am/cdk/forms/checkbox/checkbox.component";
import { AsyncPipe } from "@angular/common";
import { AmstoreSelectComponent } from "@am/cdk/forms/select/select.component";
import {
    type CreatePatternDto,
    FullPatternEntityDto, type FullPatternSizeDto,
    ImageDto,
    type PatternEntityDto,
    type PatternSizeDto
} from "@am/root/api";
import { PatternsService } from "@am/services/patterns.service";
import { ImageListComponent } from "@am/shared/image-list/image-list.component";
import { AmstoreUploadComponent } from "@am/cdk/forms/upload/upload.component";
import { AmstorePatternSizesComponent } from "@am/shared/card/pattern-add/components/pattern-sizes.component";
import { FormArrayPipe } from "@am/shared/pipes/form-array.pipe";


@Component({
    selector: "amstore-pattern-add-card",
    templateUrl: "./pattern-add.component.html",
    styleUrls: ["./pattern-add.component.scss"],
    standalone: true,
    imports: [
        AmstoreButtonComponent,
        AmstoreInputComponent,
        AmstoreCheckboxComponent,
        ReactiveFormsModule,
        AsyncPipe,
        AmstoreSelectComponent,
        ImageListComponent,
        AmstoreUploadComponent,
        AmstorePatternSizesComponent,
        FormArrayPipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmstorePatternAddCardComponent extends AmstoreCardDirective {
    private patternSizesComponent: Signal<AmstorePatternSizesComponent> = viewChild("patternSizes", { read: AmstorePatternSizesComponent });

    public data: InputSignal<FullPatternEntityDto> = input();
    public onBack: OutputEmitterRef<void> = output();

    private changeDetector: ChangeDetectorRef = inject(ChangeDetectorRef);
    private categoriesService: CategoriesService = inject(CategoriesService);
    private patternsService: PatternsService = inject(PatternsService);

    public categoriesList$: Observable<OptionType[]> = this.categoriesService.categoriesList$;
    public images: ImageDto[] = [];

    public patternForm: FormGroup;
    public sizeArrayForm: FormArray;

    constructor() {
        super();

        this.sizeArrayForm = new FormArray([]);
        this.patternForm = new FormGroup({
            name: new FormGroup({
                en: new FormControl('', [Validators.required]),
                ru: new FormControl('', [Validators.required]),
            }),
            description: new FormGroup({
                en: new FormControl(''),
                ru: new FormControl(''),
            }),
            basePrice: new FormGroup({
                en: new FormControl(null, [Validators.required, Validators.min(0.01)]),
                ru: new FormControl(null, [Validators.required, Validators.min(0.01)]),
            }),
            additionalPrice: new FormGroup({
                en: new FormControl(null, [Validators.required, Validators.min(0.01)]),
                ru: new FormControl(null, [Validators.required, Validators.min(0.01)]),
            }),
            colorPrice: new FormGroup({
                en: new FormControl(null, [Validators.required, Validators.min(0.01)]),
                ru: new FormControl(null, [Validators.required, Validators.min(0.01)]),
            }),
            hidden: new FormControl(null),
            categories: new FormControl([], [Validators.required]),
            color: new FormControl(null),
        });

        effect(() => {
            this.fillPatternForm(this.data());
        });
    }

    private fillPatternForm(value: FullPatternEntityDto): void {
        if (!value) {
            return;
        }

        this.images = value.images;

        this.patternForm.setValue({
            name: { ru: value.name?.ru || '', en: value.name?.en || '' },
            description: { ru: value.description?.ru || '', en: value.description?.en || '' },
            basePrice: { ru: value.basePrice?.ru || '', en: value.basePrice?.en || '' },
            additionalPrice: { ru: value.additionalPrice?.ru || '', en: value.additionalPrice?.en || '' },
            colorPrice: { ru: value.colorPrice?.ru || '', en: value.colorPrice?.en || '' },
            hidden: value.hidden,
            categories: value.categories,
            color: value.color,
        });

        this.patternSizesComponent().setSizes(value.sizes);
    }

    public openImagesEdit(): void {
        this.viewer.openImagesEditor(this.images)
            .pipe(
                filter(Boolean),
            )
            .subscribe((images: ImageDto[]) => {
                this.images = images;
                this.changeDetector.markForCheck();
            });
    }

    public save(): void {
        if (this.patternForm.invalid || this.sizeArrayForm.invalid) {
            this.patternForm.markAllAsTouched();

            return;
        }

        const id: number = this.data()?.id;
        const rawValues: typeof this.patternForm.value = this.patternForm.value;
        const values: CreatePatternDto = {
            ...rawValues,
            images: this.images.map((image: ImageDto) => image.id),
            color: rawValues.color?.id,
            sizes: this.prepareSizesValues(),
        };

        let updateRequest: Observable<unknown> = this.patternsService
            .createPattern(values);

        if (id) {
            updateRequest = this.patternsService
                .editPattern(id, values);
        }

        updateRequest.subscribe(() => this.onBack.emit());
    }

    public cancel(): void {
        this.sizeArrayForm.markAsPristine();
        this.sizeArrayForm.markAsUntouched();

        this.patternForm.markAsPristine();
        this.patternForm.markAsUntouched();

        this.fillPatternForm(this.data());
    }

    private prepareSizesValues(): PatternSizeDto[] {
        return this.sizeArrayForm
            .getRawValue()
            .map((value: Record<string, { id: number }>) => ({
                id: value.id as unknown as number,
                size: value.size as unknown as number,
                cbb: value.cbb.id,
                jbb: value.jbb.id,
                png: value.png.id,
                pdf: value.pdf.id,
            }));
    }
}
