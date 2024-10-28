import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ImageModelSmall } from '@am/interface/image.interface';
import { IPattern } from '@am/interface/pattern.interface';
import { PatternService } from '@am/services/pattern.service';
import { EMPTY_PATTERN } from "@am/shared/mocks/pattern";
import { AsyncPipe, Location } from "@angular/common";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { AmstorePatternAddCardComponent } from "@am/shared/card/pattern-add/pattern-add.component";
import { PatternsService } from "@am/services/patterns.service";
import type { PatternEntityDto } from "@am/root/api";


@Component({
    selector: "admin-pattern-edit",
    templateUrl: "./pattern-edit.component.html",
    styleUrls: ["./pattern-edit.component.scss"],
    standalone: true,
    imports: [
        AmstoreButtonComponent,
        AmstorePatternAddCardComponent,
        AsyncPipe
    ]
})
export class PatternEditComponent {
    public images: ImageModelSmall[] = [];
    public pattern$: Observable<PatternEntityDto>;

    private readonly location: Location = inject(Location);
    private readonly route: ActivatedRoute = inject(ActivatedRoute);
    private readonly patternsService: PatternsService = inject(PatternsService);

    constructor() {
        const id: number = Number(this.route.snapshot.paramMap.get('id'));

        this.pattern$ = id ? this.patternsService.getPattern(id) : null;
    }

    public getBack(): void {
        this.location.back();
    }
}
