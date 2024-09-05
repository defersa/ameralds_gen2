import { Component, ElementRef, Input, OnInit } from '@angular/core';
import { AmstoreButtonBaseDirective } from '../base.abstract.directive';

@Component({
    selector: 'amstore-button',
    templateUrl: './default.component.html',
    styleUrls: ['./default.component.scss'],
    host: {
        class: 'amstore-button-default',
        '[class.amstore-button-default-stroked]': 'stroked',
        '[class.amstore-button-default-disabled]': 'disabled',
        '[class.amstore-button-default-medium]': 'size === "medium"',
        '[class.amstore-button-default-large]': 'size === "large"',
    }
})
export class DefaultComponent extends AmstoreButtonBaseDirective implements OnInit {

    @Input()
    public size: 'medium' | 'large' = 'medium';

    @Input()
    public stroked: boolean = false;

    constructor(public elementRef: ElementRef) {
        super(elementRef);
    }

    public ngOnInit(): void {
    }

}
