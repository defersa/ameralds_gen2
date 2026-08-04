import { computed, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { toSignal } from "@angular/core/rxjs-interop";


export type LangType = 'en' | 'ru';
export type Currency = '₽' | '$';
export type SizeUnit = 'bpc' | 'бвк';

@Injectable({
    providedIn: 'root'
})
export class LangService {
    public readonly lang: WritableSignal<LangType> = signal('ru');
    public readonly currency: Signal<Currency> = computed(() => this.lang() === 'ru' ? '₽' : '$');
    public readonly sizeUnit: Signal<SizeUnit> = computed(() => this.lang() === 'ru' ? 'бвк' : 'bpc');
}
