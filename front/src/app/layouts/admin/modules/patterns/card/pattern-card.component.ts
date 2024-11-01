import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from "@angular/router";

import { AsyncPipe, Location } from "@angular/common";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { AmstorePatternCardComponent } from "@am/shared/card/pattern/pattern.component";
import { PatternCartComponent } from "@am/shared/actions/pattern/cart/pattern-cart.component";
import { Observable } from "rxjs";
import { PatternsService } from "@am/services/patterns.service";
import type { PatternEntityDto } from "@am/root/api";


@Component({
    selector: "amstore-pattern-page",
    templateUrl: "./pattern-card.component.html",
    styleUrls: ["./pattern-card.component.scss"],
    standalone: true,
    imports: [
        AmstoreButtonComponent,
        RouterLink,
        AmstorePatternCardComponent,
        PatternCartComponent,
        AsyncPipe
    ]
})
export class PatternCardComponent {
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

    public heh(): void {
        console.log('sdfsdf')
    }
}
