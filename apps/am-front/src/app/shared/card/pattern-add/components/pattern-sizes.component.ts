import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    input,
    InputSignal,
} from "@angular/core";
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { FormGroupPipe } from "@am-front/shared/pipes/form-group.pipe";
import { AmstoreSelectComponent } from "@am-front/cdk/forms/select/select.component";
import { AsyncPipe } from "@angular/common";
import { SizesService } from "@am-front/services/sizes.service";
import { Observable } from "rxjs";
import { OptionType } from "@am-front/interface/cdk.interface";
import { AmstoreUploadComponent } from "@am-front/cdk/forms/upload/upload.component";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { AmstoreInputComponent } from "@am-front/cdk/forms/input/input.component";
import type { FullPatternSizeDto } from "@am-front/root/api-v2";
import { DialogService } from "@am-front/core/dialog/dialog.service";
import { filter } from "rxjs/operators";


@Component({
    selector: "amstore-pattern-sizes",
    templateUrl: "./pattern-sizes.component.html",
    styleUrls: ["./pattern-sizes.component.scss"],
    imports: [
        ReactiveFormsModule,
        FormGroupPipe,
        AmstoreSelectComponent,
        AsyncPipe,
        AmstoreUploadComponent,
        AmstoreButtonComponent,
        AmstoreInputComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AmstorePatternSizesComponent {
    public formArray: InputSignal<FormArray> = input();

    private sizeService: SizesService = inject(SizesService);
    private changeDetector: ChangeDetectorRef = inject(ChangeDetectorRef);
    private dialog: DialogService = inject(DialogService);

    public sizesList$: Observable<OptionType[]> = this.sizeService.list$;

    public addSize(size: Partial<FullPatternSizeDto> = {}): void {
        this.formArray().push(new FormGroup({
            id: new FormControl({ value: size.id ?? null, disabled: true }),
            size: new FormControl(
                {
                    value: (size.size as unknown as Record<string, number>)?.['id'] ?? null,
                    disabled: Boolean(size.id),
                },
                Validators.required),
            cbb: new FormControl(size.cbb ?? null, Validators.required),
            jbb: new FormControl(size.jbb ?? null, Validators.required),
            png: new FormControl(size.png ?? null, Validators.required),
            pdf: new FormControl(size.pdf ?? null, Validators.required),
        }));
    }

    public setSizes(sizes: FullPatternSizeDto[]): void {
        this.formArray().clear();

        sizes.forEach((size: FullPatternSizeDto) => this.addSize(size));

        this.changeDetector.markForCheck();
    }

    public deleteSize(index: number): void {
        const needWarning: boolean = Boolean(this.formArray().at(index).get('id').value);

        if (needWarning) {
            this.dialog.openConfirmDialog({
                maxWidth: "400px",
                data: {
                    title: "Удаление размера",
                    text: "Текущий размер был загружен. При его удалении для всех пользователей, которые его купили, он перестанет быть доступным."
                }
            })
                .beforeClosed()
                .pipe(filter(Boolean))
                .subscribe(() => {
                    this.formArray().removeAt(index);

                    this.changeDetector.markForCheck();
                });

            return;
        }

        this.formArray().removeAt(index);
    }
}
