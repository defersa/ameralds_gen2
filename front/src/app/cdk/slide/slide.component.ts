import { Component, input, InputSignal, ViewEncapsulation } from "@angular/core";
import { AmstoreFormsBaseDirective } from "@am/cdk/forms/forms.abstract.directive";
import { MatSlideToggle } from "@angular/material/slide-toggle";
import { ReactiveFormsModule } from "@angular/forms";


@Component({
    selector: "amstore-slide",
    templateUrl: "./slide.component.html",
    styleUrls: ["./slide.component.scss"],
    encapsulation: ViewEncapsulation.None,
    imports: [
        MatSlideToggle,
        ReactiveFormsModule
    ],
    host: {
        class: "amstore-slide",
        "[class.amstore-slide-small]": "size() === \"small\"",
        "[class.amstore-slide-medium]": "size() === \"medium\"",
        "[class.amstore-slide-large]": "size() === \"large\""
    }
})
export class AmstoreSlideComponent extends AmstoreFormsBaseDirective {
    public size: InputSignal<'small' | 'medium' | 'large'> = input('medium');
}
