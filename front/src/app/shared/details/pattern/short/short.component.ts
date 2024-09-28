import { Component, input, Input, InputSignal } from "@angular/core";
import { IPattern } from "@am/interface/pattern.interface";
import { ILangText } from "@am/interface/lang.interface";
import { MONEY_UNIT } from "@am/utils/constants";
import { expandAnimation } from "@am/cdk/animations/expand";
import { AmstoreChipComponent } from "@am/cdk/chip/chip.component";
import { AmstoreInfoComponent } from "@am/cdk/info/info.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { RouterLink } from "@angular/router";
import { LangTextComponent } from "@am/shared/lang-text/lang-text.component";
import { LangNumberComponent } from "@am/shared/lang-text/lang-number.component";


@Component({
    selector: "amstore-pattern-details-short",
    templateUrl: "./short.component.html",
    styleUrls: ["./short.component.scss"],
    standalone: true,
    animations: [
        expandAnimation
    ],
    imports: [
        AmstoreChipComponent,
        AmstoreInfoComponent,
        AmstoreButtonComponent,
        IconsComponent,
        RouterLink,
        LangTextComponent,
        LangNumberComponent
    ]
})
export class ShortPatternDetailsComponent {
    public pattern: InputSignal<IPattern> = input();
    public routerLink: InputSignal<(string | number)[]> = input();

    public readonly moneyUnit: ILangText = MONEY_UNIT;
    public showSale: boolean = false;
}
