import { DestroyRef, effect, inject, Injectable, Injector, Signal } from "@angular/core";
import { FormControl, FormGroup, FormRecord } from "@angular/forms";
import { FullPatternEntityDto, type FullPatternSizeDto, PatternEntityDto, ShortOrderPatternDto } from "@am/root/api";
import { ICartPattern } from "@am/services/cart.service";
import { map, startWith } from "rxjs/operators";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Observable } from "rxjs";


interface PatternSizeCartGroup {
    value: FormControl<boolean>;
    label: FormControl<number>;
    bought: FormControl<boolean>;
}

interface PatternColorGroup {
    value: FormControl<boolean>;
    bought: FormControl<boolean>;
    exist: FormControl<boolean>;
}

export interface PatternCartGroup {
    sizes: FormRecord<FormGroup<PatternSizeCartGroup>>;
    color: FormGroup<PatternColorGroup>;
}

@Injectable()
export class PatternCartService {
    private readonly injector: Injector = inject(Injector);
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    private form: FormGroup<PatternCartGroup>;
    private pattern: FullPatternEntityDto;

    public initForm(
        pattern: FullPatternEntityDto,
        own: Signal<ShortOrderPatternDto>,
        cart: Signal<ICartPattern>,
        canEdit: Signal<boolean>,
    ): FormGroup {
        const formGroup: FormGroup<PatternCartGroup> = new FormGroup({
            sizes: new FormRecord({}),
            color: new FormGroup({
                value: new FormControl(),
                bought: new FormControl(),
                exist: new FormControl(Boolean(pattern.color)),
            }),
        });

        this.pattern = pattern;
        this.form = formGroup;
        pattern.sizes.forEach((size: FullPatternSizeDto) => {
            formGroup.controls.sizes
                .addControl(size.id as unknown as string, new FormGroup({
                    value: new FormControl(),
                    bought: new FormControl(),
                    label: new FormControl(size.size.value),
                }));
        });

        effect(() => {
            const iOwn: ShortOrderPatternDto = own();
            const iCart: ICartPattern = cart();
            const iCartEdit: boolean = canEdit();

            if (pattern.color) {
                const colorGroup: FormGroup<PatternColorGroup> = formGroup.controls.color;

                colorGroup.controls.bought.setValue(iOwn?.color);
                colorGroup.controls.value.setValue(iCart?.color);

                iCartEdit ? colorGroup.controls.value.enable() : colorGroup.controls.value.disable();
            }

            pattern.sizes.forEach((size: FullPatternSizeDto) => {
                const sizeFormGroup: FormGroup<PatternSizeCartGroup> = formGroup.controls.sizes.controls[size.id];

                sizeFormGroup.controls.bought.setValue(iOwn?.sizes.includes(size.id));
                sizeFormGroup.controls.value.setValue(iCart?.sizes.includes(size.id));

                iCartEdit ? sizeFormGroup.controls.value.enable() : sizeFormGroup.controls.value.disable();
            });
        }, { injector: this.injector });

        formGroup.controls.sizes.valueChanges
            .pipe(
                startWith(null),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => {
                if (!canEdit()) {
                    return;
                }

                const rawValue: ReturnType<typeof formGroup.getRawValue> = formGroup.getRawValue();
                const haveSize: boolean = Object.values(rawValue.sizes)
                    .some((size: { value: boolean; bought: boolean }) => size.value || size.bought);

                haveSize ? formGroup.controls.color.enable() : formGroup.controls.color.disable();
            });

        return formGroup;
    }

    public getFormCartObservable(): Observable<any> {
        return this.form.valueChanges
            .pipe(
                startWith(null),
                map(() => {
                    const rawValue: ReturnType<typeof this.form.getRawValue> = this.form.getRawValue();
                    const pattern: PatternEntityDto = {
                        ...this.pattern,
                        sizes: this.pattern.sizes.map((size: FullPatternSizeDto) => ({
                            ...size,
                            size: size.size.id,
                        })),
                    };

                    const hasBought: boolean = Object.values(rawValue.sizes).some(({ bought }: { bought: boolean }) => bought);
                    const sizes: number[] = Object.entries(rawValue.sizes)
                        .filter(([key, size]: [string, { value: boolean }]) => size.value)
                        .map(([key]: [string, unknown]) => Number(key));

                    const needToBuyPattern: boolean = !hasBought && sizes.length > 0;

                    return [{
                        id: pattern.id,
                        sizes,
                        pattern: needToBuyPattern,
                        color: rawValue.color?.value ?? null,
                    }, pattern];
                }),
                takeUntilDestroyed(this.destroyRef),
            );
    }
}
