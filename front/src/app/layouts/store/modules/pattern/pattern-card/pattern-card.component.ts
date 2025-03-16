import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from "@angular/router";

import { DestroyService } from "@am/utils/destroy.service";
import { AsyncPipe, Location } from "@angular/common";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { AmstorePatternCardComponent } from "@am/shared/card/pattern/pattern.component";
import { Observable } from "rxjs";
import { FullPatternEntityDto, PatternEntityDto } from "@am/root/api";
import { PatternsService } from "@am/services/patterns.service";


type PatterButtonStatus = {
    label: string;
    action: () => void;
    class: string;
}

@Component({
    selector: "amstore-pattern-page",
    templateUrl: "./pattern-card.component.html",
    styleUrls: ["./pattern-card.component.scss"],
    providers: [DestroyService],
    imports: [
        AmstoreButtonComponent,
        RouterLink,
        AmstorePatternCardComponent,
        AsyncPipe
    ]
})
export class PatternCardComponent {
    private readonly location: Location = inject(Location);
    private readonly route: ActivatedRoute = inject(ActivatedRoute);
    private readonly patternsService: PatternsService = inject(PatternsService);

    public pattern$: Observable<FullPatternEntityDto>;
    public id: number;
    public button: PatterButtonStatus = {
        label: '',
        action: () => { },
        class: ''
    }

    constructor() {
        this.id = Number(this.route.snapshot.paramMap.get('id'));

        this.pattern$ = this.id ? this.patternsService.getPattern(this.id) : null;
    }

    public getBack(): void {
        this.location.back();
    }
}
