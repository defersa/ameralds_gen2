import { Component } from '@angular/core';


@Component({
    selector: 'amstore-panel-basic',
    template: '<ng-content/>',
    standalone: true,
    styleUrls: ['./amstore-panel-basic.component.scss'],
    host: {
        class: 'amstore-panel-basic'
    }
})
export class AmstorePanelBasicComponent {

}
