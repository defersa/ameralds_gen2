import {
    computed,
    Directive,
    effect,
    ElementRef,
    inject,
    model,
    ModelSignal,
    Renderer2,
    Signal,
} from "@angular/core";


export type ThemePalette = 'primary' | 'accent' | 'warn' | 'special' | 'contrast' | undefined;

const COLOR_CLASS_PREFIX = 'amstore-';

@Directive({
    standalone: true,
})
export abstract class AmstoreColor {
    public readonly color: ModelSignal<ThemePalette> = model<ThemePalette>('primary');
    public readonly colorClass: Signal<string> = computed(() => {
        const color: ThemePalette = this.color();

        return color ? `${COLOR_CLASS_PREFIX}${color}` : '';
    });

    private previousColorClass = '';

    protected readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

    private readonly renderer: Renderer2 = inject(Renderer2);

    constructor() {
        effect(() => {
            this.setColorClass(this.colorClass());
        });
    }

    private setColorClass(colorClass: string): void {
        if (this.previousColorClass === colorClass) {
            return;
        }

        this.removePreviousColorClass();
        this.addColorClass(colorClass);

        this.previousColorClass = colorClass;
    }

    private addColorClass(colorClass: string): void {
        if (!colorClass) {
            return;
        }

        this.renderer.addClass(this.elementRef.nativeElement, colorClass);
    }

    private removePreviousColorClass(): void {
        if (!this.previousColorClass) {
            return;
        }

        this.renderer.removeClass(this.elementRef.nativeElement, this.previousColorClass);
    }
}
