import {
    DestroyRef,
    Directive,
    EventEmitter,
    inject,
    input,
    Input,
    InputSignal,
    model,
    ModelSignal,
    OnInit,
    Output
} from "@angular/core";
import { DestroyService } from "@am-front/utils/destroy.service";
import { AbstractControl, FormGroup } from "@angular/forms";
import { ThemePalette } from "@am-front/cdk/core/color";
import { takeUntil } from "rxjs/operators";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Directive()
export abstract class AbstractFilterComponent implements OnInit {
    public abstract filterForm: FormGroup;

    public color: InputSignal<ThemePalette> = input('primary');

    @Input()
    public set filters(filters: Record<string, unknown>) {
        filters = filters ?? {};

        Object.entries(filters).forEach(([key, value]: [string, unknown]) => {
            this.filterForm.get(key)?.setValue(value);
        });

        this._filters = filters;

        this.checkIsEmpty();
    }

    protected _filters: Record<string, unknown> = {};

    public isChanged: boolean = false;
    public isEmpty: boolean = false;
    protected destroyRef: DestroyRef = inject(DestroyRef);

    @Output()
    public onSetFilters: EventEmitter<Record<string, unknown>> = new EventEmitter<Record<string, unknown>>();


    public ngOnInit(): void {
        this.filterForm.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.isChanged = true);
    }

    public setFilters(): void {
        const values: Record<string, unknown> = this.filterForm.getRawValue();
        this._filters = values;

        this.checkIsEmpty();

        this.onSetFilters.emit(values);
    }

    public resetFilters(): void {
        this.filters = this._filters;
    }

    public clearFilters(event: MouseEvent): void {
        event.stopPropagation();

        Object.values(this.filterForm.controls).forEach((item: AbstractControl) => item.setValue(null));
        this.setFilters();
    }

    protected checkIsEmpty(): void {
        this.isChanged = false;
        this.isEmpty = !Boolean(Object.values(this._filters).filter((value: unknown) => (value as string)?.length).length);
    }
}


