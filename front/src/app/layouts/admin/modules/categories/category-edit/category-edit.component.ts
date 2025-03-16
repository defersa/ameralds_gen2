import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute } from '@angular/router';
import { CategoriesService } from '@am/services/categories.service';
import { map } from "rxjs/operators";
import { Location } from "@angular/common";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { AmstoreInputComponent } from "@am/cdk/forms/input/input.component";
import type { CategoryDto } from "@am/root/api";


@Component({
    selector: "app-category-edit",
    templateUrl: "./category-edit.component.html",
    styleUrls: ["./category-edit.component.scss"],
    imports: [
        AmstoreButtonComponent,
        AmstoreInputComponent,
        ReactiveFormsModule
    ]
})
export class CategoryEditComponent implements OnInit {
    protected readonly location: Location = inject(Location);
    private route: ActivatedRoute = inject(ActivatedRoute);
    private categories: CategoriesService = inject(CategoriesService);

    public id: number;

    public form: FormGroup = new FormGroup({
        id: new FormControl(),
        ru: new FormControl(),
        en: new FormControl()
    });
    public ngOnInit(): void {
        this.id = Number(this.route.snapshot.paramMap.get('id')) ?? null;

        if (this.id && typeof this.id === 'number') {
            this.categories.getCategory(this.id)
                .pipe(map((result: CategoryDto) => ({ ...result.label, id: result.id })))
                .subscribe((result: Record<string, string | number>) => {
                    this.form.setValue(result);
                });
        }
    }

    public save(): void {
        (this.id ?
            this.categories.editCategory(this.form.getRawValue()) :
            this.categories.createCategory(this.form.getRawValue()))
                .subscribe(() => this.getBack());
    }

    public delete(): void {
        this.categories.deleteCategory(Number(this.id))
            .subscribe(() => this.getBack());
    }

    public getBack(): void {
        this.location.back();
    }
}
