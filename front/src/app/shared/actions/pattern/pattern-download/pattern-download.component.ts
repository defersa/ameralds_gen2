import { Component } from "@angular/core";

import { AbstractPatternCard } from "@am/shared/actions/pattern/pattern.abstract";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";


@Component({
    selector: "amstore-pattern-download",
    templateUrl: "./pattern-download.component.html",
    styleUrls: ["./pattern-download.component.scss"],
    standalone: true,
    imports: [
        AmstoreButtonComponent
    ]
})
export class PatternDownloadComponent extends AbstractPatternCard {
    public downloadPattern(patternSizeId: number, format: 'pdf' | 'cbb' | 'png', sizeValue: number): void {
    }

    public downloadColor(): void {
    }
}
