import {
    Directive,
    HostBinding,
    inject,
    input, InputSignal, effect
} from "@angular/core";
import { AmstoreColor } from "@am-front/cdk/core/color";
import { ImageModelSmall } from "@am-front/interface/image.interface";
import { AmstoreViewerService } from "@am-front/shared/viewer/viewer.service";
import { ImageDto } from "@am-front/root/api";


@Directive({
    selector: "[appSnapshotBase]",
    standalone: true,
})
export class AmstoreSnapshotBaseDirective extends AmstoreColor {
    @HostBinding("class")
    public classes: string = "amstore-snapshot";

    private _viewer: AmstoreViewerService = inject(AmstoreViewerService);

    public isDark: InputSignal<boolean> = input();
    public routerLink: InputSignal<(string | number)[]> = input();

    constructor() {
        super();

        effect(() => {
            const isDark: boolean = this.isDark();

            isDark ?
                this.elementRef.nativeElement.classList.add(`amstore-snapshot-dark`) :
                this.elementRef.nativeElement.classList.remove(`amstore-snapshot-dark`);
        });
    }

    public openViewer(images: ImageDto[], index: number): void {
        this._viewer.openImageViewer(images, index);
    }
}
