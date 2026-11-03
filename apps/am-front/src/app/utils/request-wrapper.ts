import { computed, DestroyRef, inject, Signal, signal, WritableSignal } from '@angular/core';
import { catchError, EMPTY, Observable, tap } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";


export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';
type AllRequestFn = (...args: any[]) => Observable<any>;
type RequestFn<F extends AllRequestFn> =
    (...args: Parameters<F>) => ReturnType<F>;

export interface RequestWrapper<F extends AllRequestFn> {
    errors: Signal<Error | null>;
    status: Signal<RequestStatus>;
    loading: Signal<boolean>;
    request: RequestFn<F>;
    clear: () => void;
}

export function createRequestWrapper<F extends AllRequestFn>(func: F): RequestWrapper<F> {
    const destroyRef: DestroyRef = inject(DestroyRef);
    const errors: WritableSignal<Error | null> = signal(null);
    const status: WritableSignal<RequestStatus> = signal('idle');

    return {
        status,
        errors,
        loading: computed(() => status() === 'loading'),
        request: (...args: Parameters<F>): ReturnType<F> => {
            status.set('loading');
            errors.set(null);

            return func(...args)
                .pipe(
                    catchError((error: Error) => {
                        errors.set(error);
                        status.set('error');

                        return EMPTY;
                    }),
                    tap(() => {
                        status.set('success');
                    }),
                    takeUntilDestroyed(destroyRef),
                ) as ReturnType<F>;
        },
        clear: () => {
            errors.set(null);
            status.set('idle');
        },
    }
}
