import { inject, Injectable } from "@angular/core";

import { Observable, OperatorFunction, pipe } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { OptionType } from "@am/interface/cdk.interface";
import { BehaviorObservable, GetDataAction, GetOptionsObservable } from "@am/utils/data-action.subject";
import { SnackService } from "@am/services/snackbar.service";
import {
    type SizesPaginatedPageDto, type SizeDto, type SizesDto, SizesProducer
} from "@am/root/api";


@Injectable({
    providedIn: 'root'
})
export class SizesService {
    private snack: SnackService = inject(SnackService)
    private sizesService: SizesProducer = inject(SizesProducer);

    public sizes$: BehaviorObservable<SizeDto[]> = GetDataAction([], () => this.getAllSizes());
    public sizesList$: Observable<OptionType[]> = GetOptionsObservable(this.sizes$);

    public getSizes(page: number): Observable<SizesPaginatedPageDto> {
        return this.sizesService.sizesControllerPage(page);
    }

    public getSize(id: number): Observable<SizeDto> {
        return this.sizesService.sizesControllerEntity(id);
    }

    public getAllSizes(): Observable<SizeDto[]> {
        return this.sizesService.sizesControllerAll()
            .pipe(
                map((response: SizesDto) => response.items)
            );
    }

    public editSize(id: number, values: { value: number }): Observable<SizeDto> {
        return this.sizesService.sizesControllerEdit(id, { value: values.value })
            .pipe(this.retakeAndMessage('Размер изменен!'))
    }

    public saveSize(values: { value: number }): Observable<SizeDto> {
        return this.sizesService.sizesControllerCreate({ value: values.value })
            .pipe(this.retakeAndMessage('Размер добавлен!'));
    }

    public deleteSize(id: number): Observable<void> {
        return this.sizesService.sizesControllerRemove(id)
            .pipe(this.retakeAndMessage('Размер удален'));
    }

    private retakeAndMessage<T>(message: string): OperatorFunction<T, T> {
        return pipe(
            this.snack.informAfterResult(message),
            tap(() => {
                this.sizes$.retake();
            })
        )
    }
}
