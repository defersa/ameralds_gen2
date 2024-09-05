import { OptionType } from '@am/interface/cdk.interface';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { combineLatest, Observable, OperatorFunction, pipe } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CategoryType } from '@am/interface/category.interface';
import {
    IItemResponse,
    IListResponse,
    IPaginatedResponse,
    IResultRequest
} from '@am/interface/request.interface';
import { UB } from '@am/utils/action-builder';
import { SnackService } from "@am/services/snackbar.service";
import { BehaviorObservable, GetDataAction } from "@am/utils/data-action.subject";
import { LangService, LangType } from "@am/services/lang.service";


@Injectable({
    providedIn: 'root'
})
export class CategoriesService {
    public categories$: BehaviorObservable<CategoryType[]> = GetDataAction([], () => this.getAllCategories());
    public categoriesList$: Observable<OptionType[]> = this.getCategoriesListObs();

    constructor(
        private httpClient: HttpClient,
        private snack: SnackService,
        private langService: LangService,
    ) {
    }

    public getCategory(id: number): Observable<CategoryType> {
        return this.httpClient.get<IItemResponse<CategoryType>>(UB(['api', 'categories', id]))
            .pipe(map((result: IItemResponse<CategoryType>) => result.item));
    }

    public getCategories(page: number): Observable<IPaginatedResponse<CategoryType>> {
        return this.httpClient.get<IPaginatedResponse<CategoryType>>(UB(['api', 'categories', 'paginated']), {
            params: {
                page
            }
        });
    }

    public getAllCategories(): Observable<CategoryType[]> {
        return this.httpClient.get<IListResponse<CategoryType>>(UB(['api', 'categories', 'all']))
            .pipe(map((result: IListResponse<CategoryType>) => result.items));
    }

    public editCategory(values: Record<string, unknown>): Observable<IResultRequest> {
        return this.httpClient
            .patch<IResultRequest>(UB(['api', 'categories']), values)
            .pipe(this.retakeAndMessage('Категория изменена!'));
    }

     public saveCategory(values: Record<string, unknown>): Observable<IItemResponse<CategoryType>> {
        return this.httpClient
            .post<IItemResponse<CategoryType>>(UB(['api', 'categories']), values)
            .pipe(this.retakeAndMessage('Категория добавлена!'));
    }

    public deleteCategory(id: number): Observable<IResultRequest> {
        return this.httpClient
            .delete<IResultRequest>(UB(['api', 'sizes', id]))
            .pipe(this.retakeAndMessage('Размер изменен!'));
    }

    private retakeAndMessage<T extends { result: boolean }>(message: string): OperatorFunction<T, T> {
        return pipe(
            this.snack.getSnackTap(message),
            tap(() => {
                this.categories$.retake();
            })
        )
    }

    private getCategoriesListObs(): Observable<OptionType[]> {
        return combineLatest([this.langService.lang$, this.categories$]).pipe(
            map(([lang, values]: [LangType, CategoryType[]]) => values.map((item: CategoryType) => ({
                label: item.name[lang],
                value: item.id
            }))),
        )
    }
}
