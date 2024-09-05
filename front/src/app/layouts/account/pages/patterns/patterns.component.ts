import { Component } from '@angular/core';
import { IPattern } from 'src/app/interface/pattern.interface';

@Component({
    selector: 'app-patterns',
    templateUrl: './patterns.component.html',
    styleUrls: ['./patterns.component.scss']
})
export class PatternsComponent {
    public items: IPattern[] = [];
    public pageCount: number = 1;
    public page: number = 1;


    constructor() {

    }

    ngOnInit(): void {
    }



}
