import { Component, input, InputSignal, model, ModelSignal } from "@angular/core";
import { AmstoreColor } from "@am/cdk/core/color";
import { expandAnimation } from "@am/cdk/animations/expand";
import { AmstoreDividerComponent } from "@am/cdk/divider/divider.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";


@Component({
    selector: "amstore-panel",
    templateUrl: "./panel-expand.component.html",
    styleUrls: ["./panel-expand.component.scss"],
    animations: [
        expandAnimation
    ],
    imports: [
        AmstoreDividerComponent,
        IconsComponent
    ],
    host: {
        class: "amstore-panel"
    }
})
export class AmstorePanelExpandComponent extends AmstoreColor {
    public state: ModelSignal<boolean> = model(false);
    public clickable: InputSignal<boolean> = input(true);

    public get expandState(): 'collapsed' | 'expanded' {
        return this.state() ? 'expanded' : 'collapsed';
    }

    public changeState(): void {
        if (!this.clickable()) {
            return;
        }

        this.state.set(!this.state());
    }

}

// TODO: УДОЛИ
@Component({
    selector: 'amstore-panel-header',
    standalone: true,
    template: '<ng-content/>',
})
export class AmstorePanelHeaderComponent {

}
