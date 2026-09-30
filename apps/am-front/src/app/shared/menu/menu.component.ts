import {
    ChangeDetectionStrategy,
    Component,
    InjectionToken,
    input,
    InputSignal,
} from '@angular/core';
import { IconsName } from "@am-front/cdk/icons/icons.map";
import { ThemePalette } from "@am-front/cdk/core/color";
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from "@angular/router";
import { AmstoreButtonMenuComponent } from "@am-front/cdk/buttons/menu/menu.component";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { MatDivider } from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';


export type MenuListType = {
    label: string;
    path?: string[];
    icon?: IconsName;
    fontIcon?: string;
}

export type SectionsConfig = {
    menu: {
        label: string;
        color: ThemePalette;
        list: MenuListType[];
    }
}

export type MenuSection = {
    color: ThemePalette;
    list: MenuListType[];
}

export const AMSTORE_SECTION_CONFIG: InjectionToken<SectionsConfig> =
    new InjectionToken<SectionsConfig>('AMSTORE_SECTION_CONFIG');


@Component({
    selector: "amstore-menu",
    templateUrl: "./menu.component.html",
    styleUrls: ["./menu.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AmstoreButtonMenuComponent,
        RouterLink,
        RouterLinkActive,
        IconsComponent,
        MatDivider,
        MatIcon
    ]
})
export class MenuComponent {
    public readonly sections: InputSignal<MenuSection[]> = input();
    public readonly routerLinkActiveOptions: IsActiveMatchOptions = {
        paths: 'subset',
        queryParams: 'ignored',
        matrixParams: 'ignored',
        fragment: 'ignored',
    };
}
