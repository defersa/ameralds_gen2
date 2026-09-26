import {
    Directive,
    inject,
    input,
    InputSignal,
} from "@angular/core";
import { AmstoreColor } from "@am-front/cdk/core/color";
import { AmstoreViewerService } from "@am-front/shared/viewer/viewer.service";
import { ImageDto } from "@am-front/root/api-v2";


@Directive({
    selector: "[amstoreSnapshotBase]",
    standalone: true,
      host: {
        class: "amstore-snapshot",
        "[class.amstore-snapshot-dark]": "isDark()",
      },
})
export class AmstoreSnapshotBaseDirective extends AmstoreColor {
    private _viewer: AmstoreViewerService = inject(AmstoreViewerService);

    public isDark: InputSignal<boolean> = input();
    public routerLink: InputSignal<(string | number)[]> = input();

    public openViewer(images: ImageDto[], index: number): void {
        this._viewer.openImageViewer(images, index);
    }
}
