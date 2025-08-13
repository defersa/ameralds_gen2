import { Component, computed, effect, input, InputSignal, Signal } from "@angular/core";
import { AmstoreColor, ThemePalette } from '../core/color';
import { IconsName } from "@am-front/cdk/icons/icons.map";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";


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
    selector: "amstore-info",
    templateUrl: "./info.component.html",
    styleUrls: ["./info.component.scss"],
    imports: [
        IconsComponent
    ],
    host: {
        class: "amstore-info",
        "[class.is-contrast]": "contrast()"
    }
})
export class AmstoreInfoComponent extends AmstoreColor  {
    public status: InputSignal<StatusInfo> = input('success');
    public contrast: InputSignal<boolean> = input(false);
    public needIcon: InputSignal<boolean> = input(true);

    public icon: Signal<IconsName> = computed(() => ICON_MAP[this.status()]);

    constructor() {
        super();

        effect(() => {
            this.color.set(STATUS_MAP[this.status()]);
        });
    }


}
