import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output
} from '@angular/core';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { AmstoreViewerService } from '@am/shared/viewer/viewer.service';

import { CategoryType } from '@am/interface/category.interface';
import { OptionType } from '@am/interface/cdk.interface';
import { ImageAddRequest, ImageModelSmall, IIndexedBlob, IIndexedImage } from '@am/interface/image.interface';
import {
    IPattern,
    PattenSizeFiles,
    PatternSaveResultResponse,
    PatternSaveSizeResult
} from '@am/interface/pattern.interface';
import { ArrayComponent } from '@am/cdk/forms/array/array.component';
import { AbstractControl, UntypedFormArray, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { SizesService } from '@am/services/sizes.service';
import { SizeType } from '@am/interface/size.interface';
import { ArrayValidatorFns } from '@am/cdk/forms/array/array-validators-fn';
import { CategoriesService } from '@am/services/categories.service';
import { PatternService } from '@am/services/pattern.service';

import { AmstoreCardDirective } from '../card.directive';
import { IResultRequest } from "@am/interface/request.interface";
import { ImagesService } from "@am/services/images.service";
import { SnackService } from "@am/services/snackbar.service";


@Component({
    selector: 'amstore-pattern-add-card',
    templateUrl: './pattern-add.component.html',
    styleUrls: ['./pattern-add.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AmstorePatternAddCardComponent extends AmstoreCardDirective implements OnDestroy, OnInit {
    public savedImages: IIndexedImage[] = [];
    public blobImages: IIndexedBlob[] = [];

    public categoriesList$: Observable<OptionType[]>;

    @Input()
    public set data(value: IPattern) {
        this.savedImages = value.images.map((item: ImageModelSmall, index: number) => ({ image: item, index }));

        this._data = value;

        this._fillPatternForm(value);
    };

    @Output()
    public onBack: EventEmitter<void> = new EventEmitter<void>();

    private _data: IPattern | null = null;

    public patternForm: UntypedFormGroup;

    public sizeArrayControl: UntypedFormArray = new UntypedFormArray([]);
    public sizeArrayComponentList: ArrayComponent[] = [];
    public sizeArrayModel: Record<string, unknown>[] = [];

    protected destroyed: Subject<void> = new Subject<void>();

    constructor(public elementRef: ElementRef,
                private _changeDetector: ChangeDetectorRef,
                private _sizeService: SizesService,
                private _categoriesService: CategoriesService,
                private _imageService: ImagesService,
                private _patternService: PatternService,
                private _arrayValidatorsFns: ArrayValidatorFns,
                private _snackService: SnackService,
                protected viewer: AmstoreViewerService) {
        super(viewer);

        this.patternForm = new UntypedFormGroup({
            name: new UntypedFormGroup({
                en: new UntypedFormControl(null, [Validators.required]),
                ru: new UntypedFormControl(null, [Validators.required]),
            }),
            price: new UntypedFormGroup({
                en: new UntypedFormControl(null, [Validators.required]),
                ru: new UntypedFormControl(null, [Validators.required]),
            }),
            hidden: new UntypedFormControl(null, [Validators.required]),
            category: new UntypedFormControl(null, [Validators.required]),
            colors: new UntypedFormControl(null, [Validators.required])
        });
    }

    public ngOnInit(): void {
        this.categoriesList$ = this._categoriesService.categoriesList$;

        this.initSizes();
    }

    public getLangControl(groupName: string, controlName: string): UntypedFormControl {
        return (this.patternForm.get(groupName) as UntypedFormGroup).get(controlName) as UntypedFormControl;
    }

    private _fillPatternForm(value: IPattern): void {
        this.patternForm.setValue({
            price: value.price,
            name: value.name,
            hidden: value.hidden,
            category: value.category.map((item: CategoryType) => item.id),
            colors: value.colors
        });
        this.sizeArrayModel = value.sizes.map((item: Record<string, unknown>) => ({
            ...item,
            size: (item.size as Record<string, number>).id
        }));
    }

    public initSizes(): void {
        this._sizeService.sizes$
            .subscribe((items: SizeType[]) => {
                this.sizeArrayComponentList = [
                    {
                        name: 'id',
                        label: 'ID',
                        component: 'label',
                        classes: 'col-12'
                    },
                    {
                        name: 'size',
                        component: 'select',
                        label: 'Размер',
                        items: items.map((item: SizeType) => ({ label: String(item.value), value: item.id })),
                        classes: 'col-12',
                        validator: [Validators.required, this._arrayValidatorsFns.getNotUniqValue('size')]
                    },
                    {
                        name: 'cbb',
                        label: '.cbb',
                        component: 'file',
                        classes: 'col-12',
                        validator: [Validators.required]
                    },
                    {
                        name: 'png',
                        label: '.png',
                        component: 'file',
                        classes: 'col-12',
                        validator: [Validators.required]
                    },
                    {
                        name: 'pdf',
                        label: '.pdf',
                        component: 'file',
                        classes: 'col-12',
                        validator: [Validators.required]
                    },
                    {
                        name: 'jbb',
                        label: '.jbb',
                        component: 'file',
                        classes: 'col-12',
                        validator: [Validators.required]
                    }
                ];
                this._changeDetector.markForCheck();
            });
    }

    public ngOnDestroy(): void {
        this.destroyed.next();
        this.destroyed.complete();
    }

    public openImagesEdit(): void {
        this.viewer.openImageEditor(this.savedImages, this.blobImages)
            .subscribe((images: null | [IIndexedImage[], IIndexedBlob[]]) => {
                if (!images) {
                    return;
                }
                [this.savedImages, this.blobImages] = images;
                this._changeDetector.markForCheck();
            });
    }

    public save(): void {
        const isSizeArrayInvalid: boolean = this.sizeArrayControl.controls.reduce((acc: boolean, item: AbstractControl) => acc || item.invalid, false);
        if (isSizeArrayInvalid || this.patternForm.invalid) {
            this.sizeArrayControl.markAllAsTouched();
            this.patternForm.markAllAsTouched();

            this._snackService.open('Не все поля заполнены корректно');
            return;
        }

        let id = this._data ? this._data.id : null;
        let value: Record<string, unknown> = {
            id,
            patternSizes: this.sizeArrayControl.getRawValue(),
            ...this.patternForm.getRawValue(),
        };

        combineLatest([
            of(null),
            ...this.blobImages.map((image: IIndexedBlob) => {
                return this._imageService.uploadImage(image.image)
                    .pipe(map((item: ImageAddRequest) => ({ id: item.image.id, index: image.index })));
            })
        ])
            .pipe(
                tap((blobRequest: ({ id: number; index: number; } | null)[]) => value = { ...value, images: this._formatImageEntity(blobRequest) }),
                switchMap(() => id ? this._patternService.updatePattern(value) : this._patternService.createPattern(value)),
                tap((result: PatternSaveResultResponse) => id = result.id),
                switchMap((result: PatternSaveResultResponse) => combineLatest([
                    ...result.sizes.map((item: PatternSaveSizeResult) =>
                        this._getSetPatternRequest(item, value.patternSizes)),
                    this._getSetColorRequest(id, value.colors)
                ])),
                map(() => ({ result: true })),
                this._snackService.getSnackTap('Все сохранено'),
            )
            .subscribe(() => this.onBack.emit());
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
            fileList.append('colors', color);
        }

        return this._patternService.setPatternColorFile(fileList);
    }

    private _formatImageEntity(blobRequest: ({ id: number; index: number; } | null)[]): number[] {
        const blobImages: { id: number; index: number; }[] =
            blobRequest.filter((item: { id: number; index: number; } | null) => item !== null) as { id: number; index: number; }[];

        return [
            ...this.savedImages.map((item: IIndexedImage) => ({ id: item.image.id, index: item.index })),
            ...blobImages
        ]
            .sort((a: { id: number; index: number; }, b: { id: number; index: number; }) => a.index - b.index)
            .map((item: { id: number; index: number; }) => item.id);
    }
}
