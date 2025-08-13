import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from "@angular/router";

import { AsyncPipe, Location } from "@angular/common";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { AmstorePatternCardComponent } from "@am-front/shared/card/pattern/pattern.component";
import { Observable } from "rxjs";
import { PatternsService } from "@am-front/services/patterns.service";
import { FullPatternEntityDto } from "@am-front/root/api";
import { PatternCartComponent } from "@am-front/shared/actions/pattern/pattern-cart/pattern-cart.component";


@Component({
    selector: "amstore-pattern-page",
    templateUrl: "./pattern-card.component.html",
    styleUrls: ["./pattern-card.component.scss"],
    imports: [
        AmstoreButtonComponent,
        RouterLink,
        AmstorePatternCardComponent,
        PatternCartComponent,
        AsyncPipe,
        PatternCartComponent
    ]
})
export class PatternCardComponent {
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
