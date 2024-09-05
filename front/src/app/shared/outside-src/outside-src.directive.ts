import { Directive, ElementRef, Input } from '@angular/core';
import { environment } from "../../../environments/environment";


@Directive({
    selector: '[outsideSrc]'
})
export class OutsideSrcDirective {

    @Input()
    public set outsideSrc(src: string) {
        this.elementRef?.nativeElement.setAttribute('src', environment.endpoint + src);
    }

    constructor(private elementRef: ElementRef) {
    }

}
