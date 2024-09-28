import { Directive, effect, ElementRef, inject, input, InputSignal } from "@angular/core";
import { environment } from "../../../environments/environment";


// TODO: УДОЛИ
@Directive({
    selector: '[outsideSrc]',
    standalone: true,
})
export class OutsideSrcDirective {
    public outsideSrc: InputSignal<string> = input();

    private elementRef: ElementRef = inject(ElementRef);

    constructor() {
        effect(() => {
            this.elementRef?.nativeElement.setAttribute('src', environment.endpoint + this.outsideSrc());
        });
    }

}
