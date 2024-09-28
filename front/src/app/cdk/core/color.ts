import {
    computed,
    Directive,
    effect,
    ElementRef,
    inject,
    model,
    ModelSignal,
    Signal
} from "@angular/core";


export type ThemePalette = 'primary' | 'accent' | 'warn' | 'special' | 'contrast' | undefined;

@Directive({
    standalone: true,
})
export class AmstoreColor {
    public color: ModelSignal<ThemePalette> = model('primary');
    public colorClass: Signal<string> = computed(() => `amstore-${this.color()}`);

    private previousColorClass: string = '';

    protected elementRef: ElementRef = inject(ElementRef);

    constructor() {
        effect(() => {
            if (this.previousColorClass) {
                this.elementRef.nativeElement.classList.remove(this.previousColorClass);
            }

            if (this.colorClass()) {
                this.elementRef.nativeElement.classList.add(this.colorClass());
            }

            this.previousColorClass = this.colorClass();
        });
    }
}
