import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from "@angular/core";
import { ILangText, LangType } from "@am-front/interface/lang.interface";
import { LangService } from "@am-front/services/lang.service";
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

    public lang: Signal<LangType> = toSignal(this.langService.lang$);
    public template: Signal<string> = computed(() => {
        const lang: LangType = this.lang();
        const value: ILangText = this.text();

        return value?.[lang];
    });
}
