import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'amstore-panel-basic',
    template: '<ng-content></ng-content>',
    styleUrls: ['./amstore-panel-basic.component.scss'],
    host: {
        class: 'amstore-panel-basic'
    }
})
export class AmstorePanelBasicComponent implements OnInit {

    constructor() { }

    ngOnInit(): void {
    }

}
