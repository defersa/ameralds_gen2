import { computed, DestroyRef, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';

import { combineLatest, Observable, OperatorFunction, pipe } from "rxjs";
import { map, tap } from 'rxjs/operators';

import { OptionType } from "@am-front/interface/cdk.interface";
import { BehaviorObservable, GetDataAction, GetOptionsObservable } from "@am-front/utils/data-action.subject";
import { SnackService } from "@am-front/services/snackbar.service";
import {
    type SizesPaginatedPageDto, type SizeDto, type SizesDto, ApiSizesProducer, type CategoryDto, type CategoriesDto
} from '@am-front/root/api-v2';
import { LangType } from "@am-front/services/lang.service";
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';


@Injectable({
    providedIn: 'root'
})
export class SizesService {
    private snack: SnackService = inject(SnackService)
    private sizesService: ApiSizesProducer = inject(ApiSizesProducer);
    private destroyRef: DestroyRef = inject(DestroyRef);

    public sizes: WritableSignal<SizeDto[]> = signal([]);
    public sizesList: Signal<OptionType[]> = computed(() => this.sizes()
        .map((size: SizeDto) => ({ value: size.id, label: String(size.value) })));

    public readonly sizesById: Signal<Record<number, OptionType>> = computed(() =>
        Object.fromEntries(
            this.sizesList().map((category: OptionType) => [category.value, category])));

    public getSizes(page: number): Observable<SizesPaginatedPageDto> {
        return this.sizesService.sizesControllerPage(page);
    }

    public getSize(id: number): Observable<SizeDto> {
        return this.sizesService.sizesControllerEntity(id);
    }

    constructor() {
        this.getAllSizes();
    }

    public getAllSizes(): void {
        this.sizesService.sizesControllerAll()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((response: SizesDto) => this.sizes.set(response.items));
    }

    public editSize(id: number, values: { value: number }): Observable<SizeDto> {
        return this.sizesService.sizesControllerEdit(id, { value: values.value })
            .pipe(this.retakeAndMessage('Размер изменен'))
    }

    public saveSize(values: { value: number }): Observable<SizeDto> {
        return this.sizesService.sizesControllerCreate({ value: values.value })
            .pipe(this.retakeAndMessage('Размер добавлен'));
    }

    public deleteSize(id: number): Observable<void> {
        return this.sizesService.sizesControllerRemove(id)
            .pipe(this.retakeAndMessage('Размер удален'));
    }

    private retakeAndMessage<T>(message: string): OperatorFunction<T, T> {
        return pipe(
            this.snack.informAfterResult(message),
            tap(() => this.getAllSizes()),
        );
    }
}
