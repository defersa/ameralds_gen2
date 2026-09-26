import { OptionType } from "@am-front/interface/cdk.interface";
import { computed, DestroyRef, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { Observable, OperatorFunction, pipe } from 'rxjs';
import { tap } from "rxjs/operators";
import {
    IResultRequest
} from "@am-front/interface/request.interface";
import { SnackService } from "@am-front/services/snackbar.service";
import { LangService, LangType } from "@am-front/services/lang.service";
import {
    type CategoriesDto,
    type CategoriesPaginatedPageDto,
    ApiCategoriesProducer,
    type CategoryDto,
} from "@am-front/root/api-v2";
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';


@Injectable({
    providedIn: "root"
})
export class CategoriesService {
    private categoriesService: ApiCategoriesProducer = inject(ApiCategoriesProducer);
    private snack: SnackService = inject(SnackService);
    private langService: LangService = inject(LangService);
    private destroyRef: DestroyRef = inject(DestroyRef);

    public readonly categories: WritableSignal<CategoryDto[]> = signal([]);
    public readonly categoriesList: Signal<OptionType[]> = computed(() => {
        const lang: LangType = this.langService.lang();

        return this.categories()
            .map((category: CategoryDto) => ({
                label: category.label[lang],
                value: category.id
            }));
    });

    public readonly categoriesById: Signal<Record<number, OptionType>> = computed(() =>
        Object.fromEntries(
            this.categoriesList()
                .map((category: OptionType) => [category.value, category])));

    constructor() {
        this.getAllCategories();
    }

    public getCategory(id: number): Observable<CategoryDto> {
        return this.categoriesService.categoriesControllerEntity(id);
    }

    public getCategories(page: number): Observable<CategoriesPaginatedPageDto> {
        return this.categoriesService.categoriesControllerPage(page);
    }

    private getAllCategories(): void {
        this.categoriesService.categoriesControllerAll()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((response: CategoriesDto) => this.categories.set(response.items));
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
            tap(() => this.getAllCategories()),
        );
    }
}
