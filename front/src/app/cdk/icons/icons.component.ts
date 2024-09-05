import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, ViewEncapsulation } from '@angular/core';
import { AmstoreColor } from '@am/cdk/core/color';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconsMap, IconsName } from "@am/cdk/icons/icons.map";


export type IconSize = 12 | 16 | 20 | 24 | 28 | 32 | 64;

@Component({
    selector: 'amstore-icon',
    templateUrl: './icons.component.html',
    styleUrls: ['./icons.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'amstore-icon',
        '[class.is-contrast]': 'contrast',
        '[class.is-black]': 'isBlack'
    }
})
export class IconsComponent extends AmstoreColor {
    @Input()
    public iconName: IconsName = 'login';

    public get svgXml(): SafeHtml | undefined {
        return this._sanitizer.bypassSecurityTrustHtml(IconsMap[this.iconName]);
    }

    @Input()
    public size: IconSize = 16;

    @Input()
    public contrast: boolean = false;

    @Input()
    public isBlack: boolean = false;

    constructor(public elementRef: ElementRef,
        private _sanitizer: DomSanitizer,
        private _changeDetectorRef: ChangeDetectorRef) {
        super(elementRef);
    }
}
