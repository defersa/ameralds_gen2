import { CustomValidatorFns } from "@am-front/cdk/forms/custom-validators-fn";
import { SizesService } from "@am-front/services/sizes.service";
import { Component, inject, OnInit } from '@angular/core';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    UntypedFormControl,
    Validators
} from "@angular/forms";
import { ActivatedRoute } from '@angular/router';
import { Location } from "@angular/common";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { AmstoreInputComponent } from "@am-front/cdk/forms/input/input.component";
import { SizeDto } from "@am-front/root/api-v2";


@Component({
    selector: "asmtore-size-edit",
    templateUrl: "./size-edit.component.html",
    styleUrls: ["./size-edit.component.scss"],
    imports: [
        AmstoreButtonComponent,
        AmstoreInputComponent,
        ReactiveFormsModule
    ]
})
export class SizeEditComponent implements OnInit {
    public id: number;
    public form: FormGroup;

    protected readonly location: Location = inject(Location);
    private route: ActivatedRoute = inject(ActivatedRoute);
    private sizes: SizesService = inject(SizesService);

    public ngOnInit(): void {
        this.id = Number(this.route.snapshot.paramMap.get('id')) ?? null;

        this.form = new FormGroup({
            value: new FormControl(null, [
                Validators.required,
                CustomValidatorFns.getNotUniqBehaviorValue(this.sizes.sizes$, 'value')
            ])
        });

        if (this.id && typeof this.id === 'number') {
            this.sizes.getSize(this.id)
                .subscribe((result: SizeDto) => {
                    this.form.get('value').setValue(result.value);
                });
        }
    }

    public save(): void {
        (this.id ?
            this.sizes.editSize(this.id, this.form.getRawValue()) :
            this.sizes.saveSize(this.form.getRawValue())).subscribe(() => this.getBack());
    }

    public delete(): void {
        this.sizes.deleteSize(this.id).subscribe(() => this.getBack());
    }

    public getBack(): void {
        this.location.back();
    }
}
