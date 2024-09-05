import {Directive, ElementRef, HostBinding, Input, Output, EventEmitter, Injector} from '@angular/core';
import { AmstoreColor } from '@am/cdk/core/color';
import {ImageModelSmall} from "@am/interface/image.interface";
import {AmstoreViewerService} from "@am/shared/viewer/viewer.service";

@Directive({
    selector: '[appSnapshotBase]'
})
export class AmstoreSnapshotBaseDirective extends AmstoreColor {
    @HostBinding('class')
    public classes: string = 'amstore-snapshot';


    @Input()
    public get isDark(): boolean {
        return this._isDark;
    }
    public set isDark(value: boolean) {
        this._isDark = value;
        this.setDarkClass();
    }

    private _isDark: boolean = false;
    private _viewer: AmstoreViewerService;

    @Input()
    public routerLink: (string | number)[];

    constructor(private _injector: Injector) {
        super(_injector.get(ElementRef));
        this._viewer = _injector.get(AmstoreViewerService);
    }

    private setDarkClass(): void {
        this._isDark ?
            this.elementRef.nativeElement.classList.add(`amstore-snapshot-dark`) :
            this.elementRef.nativeElement.classList.remove(`amstore-snapshot-dark`);
    }

    public openViewer(images: ImageModelSmall[], index: number): void {
        this._viewer.openImageViewer(images, index);
    }
}
