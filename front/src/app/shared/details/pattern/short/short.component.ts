import { Component, Input } from '@angular/core';
import { IPattern } from "@am/interface/pattern.interface";
import { ILangText } from "@am/interface/lang.interface";
import { MONEY_UNIT } from "@am/utils/constants";
import { expandAnimation } from "@am/cdk/animations/expand";

@Component({
    selector: 'amstore-pattern-details-short',
    templateUrl: './short.component.html',
    styleUrls: ['./short.component.scss'],
    animations: [
        expandAnimation
    ],
})
export class ShortPatternDetailsComponent {
    @Input()
    public pattern: IPattern;

    @Input()
    public routerLink: (string | number)[];

    public readonly moneyUnit: ILangText = MONEY_UNIT;
    public showSale: boolean = false;

    constructor() {
    }
}
