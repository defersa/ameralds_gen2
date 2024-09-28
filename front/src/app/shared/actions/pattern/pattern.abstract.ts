import {
    computed,
    Directive,
    inject,
    input,
    InputSignal,
    Signal
} from "@angular/core";
import { UntypedFormControl } from "@angular/forms";

import { SIZE_UNIT } from "@am/utils/constants";
import { IPattern, PattenSizeFiles } from "@am/interface/pattern.interface";
import { EMPTY_PATTERN } from "@am/shared/mocks/pattern";
import { LangService } from "@am/services/lang.service";
import { map } from "rxjs/operators";
import { toSignal } from "@angular/core/rxjs-interop";


export type SizeWithControl = { value: number; control: UntypedFormControl; id: number; }

@Directive({
    selector: 'abstract-pattern-card',
})
export abstract class AbstractPatternCard {
    public pattern: InputSignal<IPattern> = input(EMPTY_PATTERN);

    public sizeUnit: Signal<string> = toSignal(this.langService.lang$.pipe(map((lang: 'en' | 'ru') => SIZE_UNIT[lang])));
    public title: Signal<string> = computed(() => {
        const lang: 'en' | 'ru' = toSignal(this.langService.lang$)();
        const pattern: IPattern = this.pattern();

        return pattern.name[lang];
    });

    public sizesWithControl: Signal<SizeWithControl[]> = computed(() =>
        this.pattern().sizes.map((item: PattenSizeFiles) => ({
            value: item.size.value,
            control: new UntypedFormControl(),
            id: item.id
        })));


    protected langService: LangService = inject(LangService);
}
