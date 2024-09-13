import { computed, Directive, effect, ElementRef, inject, input, InputSignal, Signal } from "@angular/core";


export type ThemePalette = 'primary' | 'accent' | 'warn' | 'special' | 'contrast' | undefined;

@Directive({
    standalone: true,
})
export class AmstoreColor {
    public color: InputSignal<ThemePalette> = input('primary');

    public colorClass: Signal<string> = computed(() => `amstore-${this.color()}`);

    private previousColorClass: string = '';

    protected elementRef: ElementRef = inject(ElementRef);

    constructor() {
        effect(() => {
            this.elementRef.nativeElement.classList.remove(`amstore-${this.previousColorClass}`);
            this.elementRef.nativeElement.classList.add(`amstore-${this.colorClass()}`);
            this.previousColorClass = this.colorClass();
        });
    }
}
