import { Component, inject } from "@angular/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { AsyncPipe } from "@angular/common";
import { CdkConnectedOverlay, CdkOverlayOrigin } from "@angular/cdk/overlay";
import { LangService, LangType } from '@am-front/services/lang.service';
import { LangObject } from '@am-front/interface/lang.interface';
import { AmstoreButtonRoundComponent } from '@am-front/cdk/buttons/round/round.component';


const LANGS: Record<LangType, LangObject> = {
    'en': {
        type: 'en',
        label: 'English',
        // url: 'assets/flag/en.png'
        url: 'assets/flag/en_v2.png'
    },
    'ru': {
        type: 'ru',
        label: 'Русский',
        url: 'assets/flag/ru.png'
    },
};

@Component({
    selector: "amstore-language",
    templateUrl: "./language.component.html",
    styleUrls: ["./language.component.scss"],
    imports: [
        AmstoreButtonRoundComponent,
        AsyncPipe,
        CdkOverlayOrigin,
        CdkConnectedOverlay
    ]
})
export class AmastoreLanguageComponent {
    private langService: LangService = inject(LangService)

    public currentTypeObj$: Observable<LangObject> = this.langService.lang$.pipe(map((lang: LangType) => LANGS[lang]));
    public panelOpen: boolean = false;
    public currentType: LangType = 'en';
    public langTypesList: LangObject[] = Object.values(LANGS);


    public setLang(lang: LangType): void {
        this.close();
        this.langService.lang$.next(lang);
    }

    public toggle(): void {
        this.panelOpen ? this.close() : this.open();
    }

    public close(): void {
        this.panelOpen = false;
    }

    public open(): void {
        this.panelOpen = true;
    }
}
