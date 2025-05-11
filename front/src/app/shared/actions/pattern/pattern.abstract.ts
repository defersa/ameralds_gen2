import {
    computed,
    Directive,
    inject,
    input,
    InputSignal,
    Signal
} from "@angular/core";
import { UntypedFormControl } from "@angular/forms";

import { IPattern, PattenSizeFiles } from "@am/interface/pattern.interface";
import { LangService } from "@am/services/lang.service";


export type SizeWithControl = { value: number; control: UntypedFormControl; id: number; }

@Directive({
    selector: 'abstract-pattern-card',
})
export abstract class AbstractPatternCard {
    public pattern: InputSignal<IPattern> = input();

    protected langService: LangService = inject(LangService);

    public sizeUnit: Signal<string> = this.langService.sizeUnit;
    public sizesWithControl: Signal<SizeWithControl[]> = computed(() =>
        this.pattern().sizes.map((item: PattenSizeFiles) => ({
            value: item.size.value,
            control: new UntypedFormControl(),
            id: item.id
        })));
}
