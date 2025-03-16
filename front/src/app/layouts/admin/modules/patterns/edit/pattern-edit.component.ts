import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ImageModelSmall } from '@am/interface/image.interface';
import { AsyncPipe, Location } from "@angular/common";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { AmstorePatternAddCardComponent } from "@am/shared/card/pattern-add/pattern-add.component";
import { PatternsService } from "@am/services/patterns.service";
import { FullPatternEntityDto, PatternEntityDto } from "@am/root/api";


@Component({
    selector: "admin-pattern-edit",
    templateUrl: "./pattern-edit.component.html",
    styleUrls: ["./pattern-edit.component.scss"],
    imports: [
        AmstoreButtonComponent,
        AmstorePatternAddCardComponent,
        AsyncPipe
    ]
})
export class PatternEditComponent {
    public images: ImageModelSmall[] = [];
    public pattern$: Observable<FullPatternEntityDto>;

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
