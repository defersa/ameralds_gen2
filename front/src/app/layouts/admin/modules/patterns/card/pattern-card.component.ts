import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { PatternService } from '@am/services/pattern.service';
import { IPattern } from '@am/interface/pattern.interface';
import { Location } from "@angular/common";


@Component({
    selector: 'amstore-pattern-page',
    templateUrl: './pattern-card.component.html',
    styleUrls: ['./pattern-card.component.scss']
})
export class PatternCardComponent implements OnInit {
    public pattern: IPattern | undefined;
    public id: number;
    protected readonly location: Location = inject(Location);

    constructor(
        private route: ActivatedRoute,
        private patternService: PatternService,
    ) {
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
