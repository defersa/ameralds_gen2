import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from "@angular/router";

import { AmstoreCdkModule } from '@am/cdk/cdk.module';

import { HeaderComponent } from './header.component';
import { AmstoreHeaderAdminComponent } from './admin/admin.component';



@NgModule({
    declarations: [HeaderComponent, AmstoreHeaderAdminComponent],
    imports: [
        CommonModule,
        AmstoreCdkModule,
        RouterModule
    ],
    exports: [HeaderComponent, AmstoreHeaderAdminComponent]
})
export class AmstoreHeaderModule { }
