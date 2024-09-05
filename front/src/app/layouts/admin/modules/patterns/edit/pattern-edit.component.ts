import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ImageModelSmall } from '@am/interface/image.interface';
import { IPattern } from '@am/interface/pattern.interface';
import { PatternService } from '@am/services/pattern.service';
import { EMPTY_PATTERN } from "@am/shared/mocks/pattern";
import { Location } from "@angular/common";


@Component({
    selector: 'admin-pattern-edit',
    templateUrl: './pattern-edit.component.html',
    styleUrls: ['./pattern-edit.component.scss']
})
export class PatternEditComponent {

    public id: number;
    public images: ImageModelSmall[] = [];
    public asyncPattern: Observable<IPattern>;
    private readonly location: Location = inject(Location);

    constructor(
        private route: ActivatedRoute,
        private patternService: PatternService
    ) {
        this.id = Number(this.route.snapshot.paramMap.get('id'));

        this.asyncPattern = !this.id ? of(EMPTY_PATTERN) :
            this.patternService.getPatternEdit(this.id);
    }

    public getBack(): void {
        this.location.back();
    }
}
