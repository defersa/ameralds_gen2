import { OptionType } from "@am-front/interface/cdk.interface";
import { inject, Injectable } from "@angular/core";
import { combineLatest, Observable, OperatorFunction, pipe } from "rxjs";
import { map, tap } from "rxjs/operators";
import {
    IResultRequest
} from "@am-front/interface/request.interface";
import { SnackService } from "@am-front/services/snackbar.service";
import { BehaviorObservable, GetDataAction } from "@am-front/utils/data-action.subject";
import { LangService, LangType } from "@am-front/services/lang.service";
import {
    type CategoriesDto,
    type CategoriesPaginatedPageDto, ApiCategoriesProducer,
    type CategoryDto
} from "@am-front/root/api-v2";
import { toObservable } from '@angular/core/rxjs-interop';


@Injectable({
    providedIn: "root"
})
export class CategoriesService {
    private categoriesService: ApiCategoriesProducer = inject(ApiCategoriesProducer);
    private snack: SnackService = inject(SnackService);
    private langService: LangService = inject(LangService);

    public categories$: BehaviorObservable<CategoryDto[]> = GetDataAction([], () => this.getAllCategories());
    public categoriesList$: Observable<OptionType[]> = this.getCategoriesList();
    public categoriesById$: Observable<Record<number, OptionType>> = this.getCategoriesByIds();

    public getCategory(id: number): Observable<CategoryDto> {
        return this.categoriesService.categoriesControllerEntity(id);
    }

    public getCategories(page: number): Observable<CategoriesPaginatedPageDto> {
        return this.categoriesService.categoriesControllerPage(page);
    }

    public getAllCategories(): Observable<CategoryDto[]> {
        return this.categoriesService.categoriesControllerAll()
            .pipe(
                map((response: CategoriesDto) => response.items)
            );
    }

    public editCategory(values: { id: number; ru: string; en?: string }): Observable<CategoryDto> {
        return this.categoriesService.categoriesControllerEdit(
            values.id,
            {
                en: values.en,
                ru: values.ru
            })
            .pipe(this.retakeAndMessage("Категория изменена"));
    }

    public createCategory(value: { en?: string; ru: string }): Observable<CategoryDto> {
        return this.categoriesService.categoriesControllerCreate(value)
            .pipe(this.retakeAndMessage("Категория добавлена"));
    }

    public deleteCategory(id: number): Observable<IResultRequest> {
        return this.categoriesService.categoriesControllerRemove(id)
            .pipe(this.retakeAndMessage("Категория удалена"));
    }

    private retakeAndMessage<T>(message: string): OperatorFunction<T, T> {
        return pipe(
            this.snack.informAfterResult(message),
            tap(() => this.categories$.retake())
        );
    }

    private getCategoriesList(): Observable<OptionType[]> {
        return combineLatest([
            toObservable(this.langService.lang),
            this.categories$,
        ]).pipe(
            map(([lang, values]: [LangType, CategoryDto[]]) => values.map((item: CategoryDto) => ({
                label: item.label[lang],
                value: item.id
            })))
        );
    }

    private getCategoriesByIds(): Observable<Record<number, OptionType>> {
        return combineLatest([
            toObservable(this.langService.lang),
            this.categories$,
        ]).pipe(
            map(([lang, values]: [LangType, CategoryDto[]]) =>
                Object.fromEntries(values.map((item: CategoryDto) => [item.id, {
                    label: item.label[lang],
                    value: item.id
                }]))
            ),
        );
    }
}
