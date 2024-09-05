import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, OperatorFunction, pipe } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { SizeType } from '@am/interface/size.interface';
import {
    IItemResponse,
    IListResponse,
    IPaginatedResponse,
    IResultRequest
} from '@am/interface/request.interface';
import { UB } from '@am/utils/action-builder';
import { OptionType } from "@am/interface/cdk.interface";
import { BehaviorObservable, GetDataAction, GetOptionsObservable } from "@am/utils/data-action.subject";
import { SnackService } from "@am/services/snackbar.service";


@Injectable({
    providedIn: 'root'
})
export class SizesService {
    public sizes$: BehaviorObservable<SizeType[]> = GetDataAction([], () => this.getAllSizes());
    public sizesList$: Observable<OptionType[]> = GetOptionsObservable(this.sizes$);

    constructor(
        private httpClient: HttpClient,
        private snack: SnackService,
    ) {
    }


    public getSizes(page: number): Observable<IPaginatedResponse<SizeType>> {
        return this.httpClient.get<IPaginatedResponse<SizeType>>(UB(['api', 'sizes', 'paginated']), {
            params: {
                page
            }
        });
    }

    public getSize(id: number): Observable<SizeType> {
        return this.httpClient.get<IItemResponse<SizeType>>(UB(['api', 'sizes', id]))
            .pipe(map((result: IItemResponse<SizeType>) => result.item));
    }

    public getAllSizes(): Observable<SizeType[]> {
        return this.httpClient.get<IListResponse<SizeType>>(UB(['api', 'sizes', 'all']))
            .pipe(map((result: IListResponse<SizeType>) => result.items));
    }


    public editSize(values: Record<string, unknown>): Observable<IResultRequest> {
        return this.httpClient
            .patch<IResultRequest>(UB(['api', 'sizes']), values)
            .pipe(this.retakeAndMessage('Размер изменен!'));
    }

    public saveSize(values: Record<string, unknown>): Observable<IItemResponse<SizeType>> {
        return this.httpClient
            .post<IItemResponse<SizeType>>(UB(['api', 'sizes']), values)
            .pipe(this.retakeAndMessage('Размер добавлен!'));
    }

    public deleteSize(id: number): Observable<IResultRequest> {
        return this.httpClient
            .delete<IResultRequest>(UB(['api', 'sizes', id]))
            .pipe(this.retakeAndMessage('Размер изменен!'));
    }

    private retakeAndMessage<T extends { result: boolean }>(message: string): OperatorFunction<T, T> {
        return pipe(
            this.snack.getSnackTap(message),
            tap(() => {
                this.sizes$.retake();
            })
        )
    }
}
