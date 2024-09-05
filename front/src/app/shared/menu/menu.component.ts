import { ChangeDetectionStrategy, Component, Inject, InjectionToken, } from '@angular/core';
import { IconsName } from "@am/cdk/icons/icons.map";
import { ThemePalette } from "@am/cdk/core/color";
import { Observable } from "rxjs";
import { filter, map, startWith } from "rxjs/operators";
import { ActivationEnd, Event, Router } from "@angular/router";


export type MenuListType = {
    label: string;
    path?: string[];
    icon?: IconsName;
}

export type SectionsConfig = {
    menu: {
        label: string;
        color: ThemePalette;
        list: MenuListType[];
    }
}

export const AMSTORE_SECTION_CONFIG: InjectionToken<SectionsConfig> =
    new InjectionToken<SectionsConfig>('AMSTORE_SECTION_CONFIG');


@Component({
    selector: 'amstore-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent {
    public get list(): MenuListType[] {
        return this.config?.menu?.list || [];
    }

    public get label(): string {
        return this.config.menu.label;
    }


    public get color(): ThemePalette {
        return this.config.menu.color;
    }

    public currentRoute$: Observable<string> = this.router.events
        .pipe(
            filter((event: Event) => event instanceof ActivationEnd && event.snapshot.children.length === 0),
            startWith(''),
            map(() => ('/' + this.router.url) || ''),
        );

    constructor(
        @Inject(AMSTORE_SECTION_CONFIG) private config: SectionsConfig,
        private router: Router,
    ) {
    }

}
