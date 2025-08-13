import { BehaviorSubject, Observable } from "rxjs";


export function dataAction<T>(func: () => Observable<T>): (target: BehaviorSubject<T[]>, propertyKey: string) => void {
    return function (target: Object, propertyKey: string) {


    }
}
