import { finalize, MonoTypeOperatorFunction, Observable } from 'rxjs';
import { WritableSignal } from '@angular/core';

export function loadingHandler<T>(
    loading: WritableSignal<boolean>,
): MonoTypeOperatorFunction<T> {
    return (source: Observable<T>) => {
        loading.set(true);

        return source.pipe(
            finalize(() => {
                loading.set(false);
            }),
        );
    };
}
