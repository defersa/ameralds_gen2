import { Component, ElementRef, Input } from '@angular/core';
import { AmstoreColor } from "@am/cdk/core/color";
import { expandAnimation } from "@am/cdk/animations/expand";

@Component({
    selector: 'amstore-panel',
    templateUrl: './panel-expand.component.html',
    styleUrls: ['./panel-expand.component.scss'],
    animations: [
        expandAnimation
    ],
    host: {
        class: 'amstore-panel'
    }
})
export class AmstorePanelExpandComponent extends AmstoreColor {
    @Input()
    public state: boolean = false;

    @Input()
    public clickable: boolean = true;

    public get expandState(): 'collapsed' | 'expanded' {
        return this.state ? 'expanded' : 'collapsed';
    }

    constructor(public elementRef: ElementRef) {
        super(elementRef)
    }

    public changeState(): void {
        if(!this.clickable){
            return
        }
        this.state = !this.state;
    }

}


@Component({
    selector: 'amstore-panel-header',
    template: '<ng-content></ng-content>'
})
export class AmstorePanelHeaderComponent {

}
