import { ChangeDetectionStrategy, Component, inject, InjectionToken } from "@angular/core";
import { IconsName } from "@am/cdk/icons/icons.map";
import { ThemePalette } from "@am/cdk/core/color";
import { Observable } from "rxjs";
import { filter, map, startWith } from "rxjs/operators";
import { ActivationEnd, Event, Router, RouterLink } from "@angular/router";
import { AmstoreButtonMenuComponent } from "@am/cdk/buttons/menu/menu.component";
import { AsyncPipe } from "@angular/common";
import { IconsComponent } from "@am/cdk/icons/icons.component";


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
    selector: "amstore-menu",
    templateUrl: "./menu.component.html",
    styleUrls: ["./menu.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AmstoreButtonMenuComponent,
        RouterLink,
        AsyncPipe,
        IconsComponent
    ]
})
export class MenuComponent {
    private config: SectionsConfig = inject<SectionsConfig>(AMSTORE_SECTION_CONFIG);
    private router: Router = inject(Router);

    public get list(): MenuListType[] {
        return this.config?.menu?.list || [];
    }

    public get label(): string {
        return this.config.menu.label;
    }

    public get color(): ThemePalette {
        return this.config.menu.color;
    }

    // TODO: На сигнал
    public currentRoute$: Observable<string> = this.router.events
        .pipe(
            filter((event: Event) => event instanceof ActivationEnd && event.snapshot.children.length === 0),
            startWith(''),
            map(() => ('/' + this.router.url) || ''),
        );

}
