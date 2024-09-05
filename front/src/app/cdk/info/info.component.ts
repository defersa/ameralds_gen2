import { Component, ElementRef, Input } from '@angular/core';
import { AmstoreColor, ThemePalette } from '../core/color';
import { IconsName } from "@am/cdk/icons/icons.map";


type StatusInfo = 'success' | 'alert' | 'error';
const STATUS_MAP: Record<StatusInfo, ThemePalette> = {
    'success' : 'primary',
    'alert': 'accent',
    'error': 'warn'
}
const ICON_MAP: Record<StatusInfo, IconsName> = {
    'success' : 'apply',
    'alert': 'question',
    'error': 'warn'
}

@Component({
    selector: 'amstore-info',
    templateUrl: './info.component.html',
    styleUrls: ['./info.component.scss'],
    host: {
        class: 'amstore-info',
        '[class.is-contrast]': 'contrast'
    }
})
export class AmstoreInfoComponent extends AmstoreColor  {

    @Input()
    public get status(): StatusInfo {
        return this._status;
    }
    public set status(value: StatusInfo) {
        this.color = STATUS_MAP[value];
        this._status = value;
    }
    private _status: StatusInfo = 'success';

    public get icon(): IconsName {
        return ICON_MAP[this.status];
    }

    @Input()
    public contrast: boolean = false;

    @Input()
    public needIcon: boolean = true;

    constructor(public elementRef: ElementRef) {
        super(elementRef)

        this.status = 'success';
    }


}
