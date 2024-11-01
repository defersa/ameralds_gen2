import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    effect,
    inject,
    input,
    InputSignal,
    OnInit,
    output,
    OutputEmitterRef,
    Signal,
    viewChild
} from "@angular/core";
import { Observable } from 'rxjs';
import { filter } from "rxjs/operators";

import { OptionType } from '@am/interface/cdk.interface';
import {
    AmstoreFormArrayComponent
} from "@am/cdk/forms/array/array.component";
import {
    FormArray,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators
} from "@angular/forms";
import { CategoriesService } from '@am/services/categories.service';
import { PatternService } from '@am/services/pattern.service';

import { AmstoreCardDirective } from '../card.directive';
import { IResultRequest } from "@am/interface/request.interface";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { AmstoreInputComponent } from "@am/cdk/forms/input/input.component";
import { AmstoreCheckboxComponent } from "@am/cdk/forms/checkbox/checkbox.component";
import { AsyncPipe } from "@angular/common";
import { AmstoreSelectComponent } from "@am/cdk/forms/select/select.component";
import { type CreatePatternDto, ImageDto, type PatternEntityDto, type PatternSizeDto } from "@am/root/api";
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
        AmstoreFormArrayComponent,
        ImageListComponent,
        AmstoreUploadComponent,
        AmstorePatternSizesComponent,
        FormArrayPipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmstorePatternAddCardComponent extends AmstoreCardDirective implements OnInit {
    private patternSizesComponent: Signal<AmstorePatternSizesComponent> = viewChild("patternSizes", { read: AmstorePatternSizesComponent });

    public data: InputSignal<PatternEntityDto> = input();
    public onBack: OutputEmitterRef<void> = output();

    public images: ImageDto[] = [];

    public categoriesList$: Observable<OptionType[]>;

    public patternForm: FormGroup;
    public sizeArrayForm: FormArray;

    private _changeDetector: ChangeDetectorRef = inject(ChangeDetectorRef);
    private _categoriesService: CategoriesService = inject(CategoriesService);
    private _patternService: PatternService = inject(PatternService);
    private _patternsService: PatternsService = inject(PatternsService);

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
            price: new FormGroup({
                en: new FormControl(null, [Validators.required]),
                ru: new FormControl(null, [Validators.required]),
            }),
            hidden: new FormControl(null),
            categories: new FormControl([], [Validators.required]),
            color: new FormControl(null),
        });

        effect(() => {
            this._fillPatternForm(this.data());
        });
    }

    public ngOnInit(): void {
        this.categoriesList$ = this._categoriesService.categoriesList$;

        this.initSizes();
    }

    private _fillPatternForm(value: PatternEntityDto): void {
        if (!value) {
            return;
        }

        this.images = value.images;

        this.patternForm.setValue({
            price: { en: 0, ru: 0 },
            name: { ru: value.name?.ru || '', en: value.name?.en || '' },
            description: { ru: value.description?.ru || '', en: value.description?.en || '' },
            hidden: value.hidden,
            categories: value.categories,
            color: value.color,
        });

        this.patternSizesComponent().setSizes(value.sizes);
    }

    public initSizes(): void {
        // this._sizeService.sizes$
        //     .subscribe((items: SizeDto[]) => {
        //         this.sizeArrayComponentList = [
        //             {
        //                 name: 'id',
        //                 label: 'ID',
        //                 component: 'label',
        //                 classes: 'col-12'
        //             },
        //             {
        //                 name: 'size',
        //                 component: 'select',
        //                 label: 'Размер',
        //                 items: items.map((item: SizeDto) => ({ label: String(item.value), value: item.id })),
        //                 classes: 'col-12',
        //                 validator: [Validators.required]
        //             },
        //             {
        //                 name: 'cbb',
        //                 label: '.cbb',
        //                 component: 'file',
        //                 classes: 'col-12',
        //                 validator: [Validators.required]
        //             },
        //             {
        //                 name: 'png',
        //                 label: '.png',
        //                 component: 'file',
        //                 classes: 'col-12',
        //                 validator: [Validators.required]
        //             },
        //             {
        //                 name: 'pdf',
        //                 label: '.pdf',
        //                 component: 'file',
        //                 classes: 'col-12',
        //                 validator: [Validators.required]
        //             },
        //             {
        //                 name: 'jbb',
        //                 label: '.jbb',
        //                 component: 'file',
        //                 classes: 'col-12',
        //                 validator: [Validators.required]
        //             }
        //         ];
        //         this._changeDetector.markForCheck();
        //     });
    }


    public openImagesEdit(): void {
        this.viewer.openImagesEditor(this.images)
            .pipe(
                filter(Boolean),
            )
            .subscribe((images: ImageDto[]) => {
                this.images = images;
                this._changeDetector.markForCheck();
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

        let updateRequest: Observable<unknown> = this._patternsService
            .createPattern(values);

        if (id) {
            updateRequest = this._patternsService
                .editPattern(id, values);
        }

        updateRequest.subscribe(() => this.onBack.emit());
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

    private _getSetColorRequest(patternId: number, color: unknown): Observable<IResultRequest> {
        const fileList: FormData = new FormData();
        fileList.append('patternId', String(patternId));
        if (color instanceof Blob) {
            fileList.append('color', color);
        }

        return this._patternService.setPatternColorFile(fileList);
    }
}
