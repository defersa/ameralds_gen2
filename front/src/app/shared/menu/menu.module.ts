import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MenuComponent } from "@am/shared/menu/menu.component";
import { AmstoreButtonMenuModule } from "@am/cdk/buttons/menu/menu.module";
import { AmstoreIconModule } from "@am/cdk/icons/icons.module";
import { RouterModule } from "@angular/router";


@NgModule({
    declarations: [MenuComponent],
    exports: [MenuComponent],
    imports: [
        CommonModule,
        AmstoreButtonMenuModule,
        AmstoreIconModule,
        RouterModule,
    ]
})
export class MenuModule {
}
