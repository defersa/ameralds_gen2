import { CustomValidatorFns } from '@am/cdk/forms/custom-validators-fn';
import { SizeType } from '@am/interface/size.interface';
import { SizesService } from '@am/services/sizes.service';
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from "@angular/common";


@Component({
    selector: 'asmtore-size-edit',
    templateUrl: './size-edit.component.html',
    styleUrls: ['./size-edit.component.scss']
})
export class SizeEditComponent implements OnInit {
    public id: number;
    public form: FormGroup;

    public get controlValue(): UntypedFormControl {
        return this.form?.controls['value'] as UntypedFormControl;
    }

    public get initedForm(): UntypedFormGroup {
        return this.form || new UntypedFormGroup({});
    }

    protected readonly location: Location = inject(Location);

    constructor(
        private route: ActivatedRoute,
        private sizes: SizesService
    ) {
        this.id = Number(this.route.snapshot.paramMap.get('id')) ?? null;
    }

    public ngOnInit(): void {
        this.form = new FormGroup({
            id: new FormControl(),
            create_date: new FormControl(),
            value: new FormControl(null, [
                Validators.required,
                CustomValidatorFns.getNotUniqBehaviorValue(this.sizes.sizes$, 'value')
            ])
        });

        if (this.id && typeof this.id === 'number') {
            this.sizes.getSize(this.id)
                .subscribe((result: SizeType) => {
                    this.initedForm.setValue(result);
                });
        }
    }

    public save(): void {
        (this.id ?
            this.sizes.editSize(this.initedForm.getRawValue()) :
            this.sizes.saveSize(this.initedForm.getRawValue())).subscribe(() => this.getBack());
    }

    public delete(): void {
        this.sizes.deleteSize(this.id).subscribe(() => this.getBack());
    }

    public getBack(): void {
        this.location.back();
    }
}
