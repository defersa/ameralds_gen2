import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CategoriesService } from '@am/services/categories.service';
import { CategoryType } from '@am/interface/category.interface';
import { map } from "rxjs/operators";
import { Location } from "@angular/common";


@Component({
    selector: 'app-category-edit',
    templateUrl: './category-edit.component.html',
    styleUrls: ['./category-edit.component.scss']
})
export class CategoryEditComponent implements OnInit {
    protected readonly location: Location = inject(Location);

    public id: number;

    public form: FormGroup = new FormGroup({
        id: new FormControl(),
        ru: new FormControl(),
        en: new FormControl()
    });

    constructor(
        private route: ActivatedRoute,
        private categories: CategoriesService,
    ) {
        this.id = Number(this.route.snapshot.paramMap.get('id')) ?? null;
    }

    public ngOnInit(): void {
        if (this.id && typeof this.id === 'number') {
            this.categories.getCategory(this.id)
                .pipe(map((result: CategoryType) => ({ ...result.name, id: result.id })))
                .subscribe((result: Record<string, string | number>) => {
                    this.form.setValue(result);
                });
        }
    }

    public save(): void {
        (this.id ?
            this.categories.editCategory(this.form.getRawValue()) :
            this.categories.saveCategory(this.form.getRawValue())).subscribe(() => this.getBack());
    }

    public delete(): void {
        this.categories.deleteCategory(Number(this.id))
            .subscribe(() => this.getBack());
    }

    public getBack(): void {
        this.location.back();
    }
}
