import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ILangNumber, ILangText, LangType } from "@am/interface/lang.interface";
import { LangService } from "@am/services/lang.service";
import { Observable } from "rxjs";

@Component({
    selector: 'amstore-lang-number',
    template: '{{ number[lang$ | async] }}',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangNumberComponent {
    @Input()
    public number: ILangNumber;

    public lang$: Observable<LangType> = this.langService.lang$;

    constructor(
        private langService: LangService,
    ) {
    }

}
