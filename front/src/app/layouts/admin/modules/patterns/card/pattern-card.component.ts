import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from "@angular/router";

import { PatternService } from '@am/services/pattern.service';
import { IPattern } from '@am/interface/pattern.interface';
import { Location } from "@angular/common";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { AmstorePatternCardComponent } from "@am/shared/card/pattern/pattern.component";
import { PatternCartComponent } from "@am/shared/actions/pattern/cart/pattern-cart.component";


@Component({
    selector: "amstore-pattern-page",
    templateUrl: "./pattern-card.component.html",
    styleUrls: ["./pattern-card.component.scss"],
    standalone: true,
    imports: [
        AmstoreButtonComponent,
        RouterLink,
        AmstorePatternCardComponent,
        PatternCartComponent
    ]
})
export class PatternCardComponent implements OnInit {
    public pattern: IPattern | undefined;
    public id: number;
    protected readonly location: Location = inject(Location);
    private route: ActivatedRoute = inject(ActivatedRoute);
    private patternService: PatternService = inject(PatternService);

    constructor() {
        this.id = Number(this.route.snapshot.paramMap.get('id'));
    }

    ngOnInit(): void {
        this.patternService
            .getPattern(this.id)
            .subscribe((result: IPattern) => this.pattern = result );
    }

    public getBack(): void {
        this.location.back();
    }
}
