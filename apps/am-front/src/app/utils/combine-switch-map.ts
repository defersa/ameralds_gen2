import { Observable, OperatorFunction, pipe } from 'rxjs';
import { map, switchMap } from "rxjs/operators";


export function combineSwitchMap<K, T>(func: (project: K) => Observable<T>): OperatorFunction<K, [K, T]> {
    return pipe(
        switchMap((valueK: K) =>
            func(valueK)
                .pipe(
                    map((valueT: T) => [valueK, valueT] as [K, T]),
                ),
        ),
    );
}
