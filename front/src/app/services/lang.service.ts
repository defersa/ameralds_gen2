import { computed, Injectable, Signal } from "@angular/core";
import { BehaviorSubject } from 'rxjs';
import { toSignal } from "@angular/core/rxjs-interop";


export type LangType = 'en' | 'ru';
export type Currency = '₽' | '$';
export type SizeUnit = 'bpc' | 'бвк';

@Injectable({
    providedIn: 'root'
})
export class LangService {
    public lang$: BehaviorSubject<LangType> = new BehaviorSubject<LangType>('ru');

    public lang: Signal<LangType> = toSignal(this.lang$);
    public currency: Signal<Currency> = computed(() => this.lang() === 'ru' ? '₽' : '$');
    public sizeUnit: Signal<SizeUnit> = computed(() => this.lang() === 'ru' ? 'бвк' : 'bpc');
}
