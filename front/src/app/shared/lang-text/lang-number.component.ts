import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from "@angular/core";
import { ILangNumber, LangType } from "@am/interface/lang.interface";
import { LangService } from "@am/services/lang.service";
import { toSignal } from "@angular/core/rxjs-interop";


@Component({
    selector: "amstore-lang-number",
    template: "{{ template() }}",
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangNumberComponent {
    public value: InputSignal<ILangNumber> = input();

    private langService: LangService = inject(LangService);

    public template: Signal<number> = computed(() => {
        const lang: LangType = toSignal(this.langService.lang$)();
        const value: ILangNumber = this.value();

        return value?.[lang];
    });
}
