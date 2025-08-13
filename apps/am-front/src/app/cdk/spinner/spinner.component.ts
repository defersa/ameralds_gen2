import { Component, input, Input, InputSignal, model, ModelSignal, signal, ViewEncapsulation } from "@angular/core";
import { MatProgressSpinner, ProgressSpinnerMode } from "@angular/material/progress-spinner";
import { AmstoreColor } from "@am-front/cdk/core/color";


@Component({
    selector: "amstore-spinner",
    templateUrl: "./spinner.component.html",
    styleUrls: ["./spinner.component.scss"],
    encapsulation: ViewEncapsulation.None,
    imports: [
        MatProgressSpinner
    ],
    host: {
        class: "amstore-spinner"
    }
})
export class AmstoreSpinnerComponent extends AmstoreColor {
    public isDeterminate: InputSignal<boolean> = input(false);
    public strokeWidth: InputSignal<number> = input(15);
    public value: InputSignal<number> = input(0);

    public get mode(): ProgressSpinnerMode {
        return this.isDeterminate() ? 'determinate' : 'indeterminate';
    }
}
