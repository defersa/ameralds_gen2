import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from "@angular/core";
import { ILangText, LangType } from "@am/interface/lang.interface";
import { LangService } from "@am/services/lang.service";
import { toSignal } from "@angular/core/rxjs-interop";


@Component({
    selector: 'amstore-lang-text',
    template: '{{ template() }}',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
})
export class LangTextComponent {
    public text: InputSignal<ILangText> = input();

    private langService: LangService = inject(LangService);

    public template: Signal<string> = computed(() => {
        const lang: LangType = toSignal(this.langService.lang$)();
        const value: ILangText = this.text();

        return value?.[lang];
    });
}
