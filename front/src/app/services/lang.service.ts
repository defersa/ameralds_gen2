import { Injectable, Signal } from "@angular/core";
import { BehaviorSubject } from 'rxjs';
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs/operators";


export type LangType = 'en' | 'ru';
export type Currency = '₽' | '$';

@Injectable({
    providedIn: 'root'
})
export class LangService {
    public lang$: BehaviorSubject<LangType> = new BehaviorSubject<LangType>('ru');

    public lang: Signal<LangType> = toSignal(this.lang$);
    public currency: Signal<Currency> = toSignal(
        this.lang$.pipe(map((lang: LangType) => lang === 'ru' ? '₽' : '$')),
    );
}
