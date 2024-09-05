import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'amstore-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    host: {
        class: 'amstore-header'
    }
})
export class HeaderComponent implements OnInit {

    constructor(
    ) {
    }

    ngOnInit(): void {
    }

}
