import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from "@angular/router";

import { PatternService } from '@am/services/pattern.service';
import { IPattern } from '@am/interface/pattern.interface';
import { DestroyService } from "@am/utils/destroy.service";
import { Location } from "@angular/common";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { AmstorePatternCardComponent } from "@am/shared/card/pattern/pattern.component";


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
    standalone: true,
    imports: [
        AmstoreButtonComponent,
        RouterLink,
        AmstorePatternCardComponent
    ]
})
export class PatternCardComponent implements OnInit {
    protected readonly location: Location = inject(Location);
    public pattern: IPattern | undefined;
    public id: number;

    private route: ActivatedRoute = inject(ActivatedRoute);
    private patternService: PatternService = inject(PatternService);

    public button: PatterButtonStatus = {
        label: '',
        action: () => { },
        class: ''
    }

    constructor() {
        this.id = Number(this.route.snapshot.paramMap.get('id'));
    }

    public ngOnInit(): void {
        this.patternService.getPattern(this.id)
            .subscribe((result: IPattern) => this.pattern = result );
    }

    public getBack(): void {
        this.location.back();
    }
}
