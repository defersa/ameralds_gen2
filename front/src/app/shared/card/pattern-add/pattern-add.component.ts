import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component, effect,
    EventEmitter, inject, input,
    InputSignal,
    OnInit,
    Output
} from "@angular/core";
import { Observable } from 'rxjs';
import { filter } from "rxjs/operators";

import { OptionType } from '@am/interface/cdk.interface';
import {
    PattenSizeFiles,
    PatternSaveSizeResult
} from '@am/interface/pattern.interface';
import {
    AmstoreFormArrayComponent
} from "@am/cdk/forms/array/array.component";
import {
    FormArray,
    FormControl, FormGroup,
    ReactiveFormsModule,
    UntypedFormGroup,
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
import { type CreatePatternDto, ImageDto, type PatternEntityDto } from "@am/root/api";
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
    public images: ImageDto[] = [];

    public categoriesList$: Observable<OptionType[]>;

    public data: InputSignal<PatternEntityDto> = input();

    @Output()
    public onBack: EventEmitter<void> = new EventEmitter<void>();

    public patternForm: UntypedFormGroup;

    private _changeDetector: ChangeDetectorRef = inject(ChangeDetectorRef);
    private _categoriesService: CategoriesService = inject(CategoriesService);
    private _patternService: PatternService = inject(PatternService);
    private _patternsService: PatternsService = inject(PatternsService);

    constructor() {
        super();

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
            sizes: new FormArray([]),
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
            name: { ru: value.name.ru, en: value.name.en },
            description: { ru: value.description.ru, en: value.description.en },
            hidden: value.hidden,
            categories: value.categories,
            color: value.color,
            sizes: [],
        });
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
        if (this.patternForm.invalid) {
            this.patternForm.markAllAsTouched();

            return;
        }

        const id: number = this.data()?.id;
        const rawValues: typeof this.patternForm.value = this.patternForm.value;
        const values: CreatePatternDto = {
            ...rawValues,
            images: this.images.map((image: ImageDto) => image.id),
            color: rawValues.color?.id,
        };

        let updateRequest: Observable<unknown> = this._patternsService
            .createPattern(values);

        if (id) {
            updateRequest = this._patternsService
                .editPattern(id, values);
        }

        updateRequest.subscribe(() => this.onBack.emit());

        // const isSizeArrayInvalid: boolean = this.sizeArrayControl.controls.reduce((acc: boolean, item: AbstractControl) => acc || item.invalid, false);
        // if (isSizeArrayInvalid || this.patternForm.invalid) {
        //     this.sizeArrayControl.markAllAsTouched();
        //     this.patternForm.markAllAsTouched();
        //
        //     this._snackService.open('Не все поля заполнены корректно');
        //     return;
        // }
        //
        // let id = this._data ? this._data.id : null;
        // let value: Record<string, unknown> = {
        //     id,
        //     patternSizes: this.sizeArrayControl.getRawValue(),
        //     ...this.patternForm.getRawValue(),
        // };
        //
        // combineLatest([
        //     of(null),
        //     ...this.blobImages.map((image: IIndexedBlob) => {
        //         return this._imageService.uploadImage(image.image)
        //             .pipe(map((item: ImageAddRequest) => ({ id: item.image.id, index: image.index })));
        //     })
        // ])
        //     .pipe(
        //         tap((blobRequest: ({ id: number; index: number; } | null)[]) => value = { ...value, images: this._formatImageEntity(blobRequest) }),
        //         switchMap(() => id ? this._patternService.updatePattern(value) : this._patternService.createPattern(value)),
        //         tap((result: PatternSaveResultResponse) => id = result.id),
        //         switchMap((result: PatternSaveResultResponse) => combineLatest([
        //             ...result.sizes.map((item: PatternSaveSizeResult) =>
        //                 this._getSetPatternRequest(item, value.patternSizes)),
        //             this._getSetColorRequest(id, value.color)
        //         ])),
        //         map(() => ({ result: true })),
        //         this._snackService.getSnackTap('Все сохранено'),
        //     )
        //     .subscribe(() => this.onBack.emit());
    }

    private _getSetPatternRequest(saveSizeResult: PatternSaveSizeResult, patternSizes: unknown): Observable<IResultRequest> {
        const sizes: PattenSizeFiles = (patternSizes as Record<string, unknown>[])
            .find((size: Record<string, unknown>) => size.size === saveSizeResult.size.id) as PattenSizeFiles;

        const fileList: FormData = new FormData();
        fileList.append('patternSizeId', String(saveSizeResult.id));

        if (sizes.cbb instanceof Blob) {
            fileList.append('cbb', sizes.cbb);
        }
        if (sizes.jbb instanceof Blob) {
            fileList.append('jbb', sizes.jbb);
        }
        if (sizes.png instanceof Blob) {
            fileList.append('png', sizes.png);
        }
        if (sizes.pdf instanceof Blob) {
            fileList.append('pdf', sizes.pdf);
        }

        return this._patternService.setPatternSizeFiles(fileList);
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
