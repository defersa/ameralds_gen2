import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from "@angular/router";
import { AmstoreCdkModule } from "@am/cdk/cdk.module";

import { AuthComponent } from './auth.component';
import { AmstoreRegistrationComponent } from './page/registration/amstore-registration.component';
import { AmstoreVerifyComponent } from "./page/verify/amstore-verify.component";


export const routes: Routes = [{
    path: '',
    component: AuthComponent,
    children: [
        {
            path: 'registration',
            component: AmstoreRegistrationComponent,
        },
        {
            path: 'verify',
            component: AmstoreVerifyComponent,
        },
    ]
}];


@NgModule({
    declarations: [AuthComponent, AmstoreRegistrationComponent, AmstoreVerifyComponent],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        AmstoreCdkModule
    ]
})
export class AuthModule {
}
