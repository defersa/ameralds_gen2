import { Component, inject } from "@angular/core";

import { downloadBlobFile } from "@am/utils/file-utils";
import { PatternService } from "@am/services/pattern.service";
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
    private patternService: PatternService = inject(PatternService);

    public downloadPattern(patternSizeId: number, format: 'pdf' | 'cbb' | 'png', sizeValue: number): void {
        this.patternService.downloadPatternBySize(patternSizeId, format)
            .subscribe((item: Blob) => {
                const name: string = this.title() + '-' + sizeValue + (item.type === 'text/cbb' ? '.cbb' : '');
                downloadBlobFile(item, name);
            });
    }

    public downloadColor(): void {
        this.patternService.downloadColor(this.pattern().id)
            .subscribe((item: Blob) => {
                const name: string = this.title() + '-colors.jpg';
                downloadBlobFile(item, name);
            });
    }
}
