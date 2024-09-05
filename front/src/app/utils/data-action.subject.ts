import { BehaviorSubject, Observable } from "rxjs";
import { map, take } from "rxjs/operators";
import { OptionType } from "@am/interface/cdk.interface";


export type BehaviorObservable<T> = {
    getValue: () => T;
    retake: () => void;
} & Observable<T>;

export function GetDataAction<T>(defaultValue: T, func: () => Observable<T>): BehaviorObservable<T> {
    const subject: BehaviorSubject<T> = new BehaviorSubject<T>(defaultValue);

    const updateValue: () => void = () => {
        func()
            .pipe(take(1))
            .subscribe((value: T) => subject.next(value));
    }

    Object.defineProperty(subject, 'retake', {
        value: () => updateValue(),
    });

    updateValue();

    return subject as unknown as BehaviorObservable<T>;
}

type ApiOption = {
    id: number | string;
    value: number | string;
}

export function GetOptionsObservable(obs: Observable<ApiOption[]>): Observable<OptionType[]>{
    return obs.pipe(
        map((values: ApiOption[]) => values.map((item: ApiOption) => ({
            label: String(item.value),
            value: item.id
        }))),
    )
}
