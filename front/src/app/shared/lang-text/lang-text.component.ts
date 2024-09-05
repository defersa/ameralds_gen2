import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ILangText, LangType } from "@am/interface/lang.interface";
import { LangService } from "@am/services/lang.service";
import { Observable } from "rxjs";

@Component({
    selector: 'amstore-lang-text',
    template: '{{ text[lang$ | async] }}',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangTextComponent {
    @Input()
    public text: ILangText;

    public lang$: Observable<LangType> = this.langService.lang$;

    constructor(
        private langService: LangService,
    ) {
    }

}
