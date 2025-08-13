import { Component } from '@angular/core';
import { IPattern } from '@am-front/interface/pattern.interface';


@Component({
    selector: 'app-patterns',
    templateUrl: './patterns.component.html',
    styleUrls: ['./patterns.component.scss'],
    standalone: true,
})
export class PatternsComponent {
    public items: IPattern[] = [];
    public pageCount: number = 1;
    public page: number = 1;
}
