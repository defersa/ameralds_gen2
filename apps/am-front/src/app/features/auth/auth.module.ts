import { NgModule } from '@angular/core';
import { RouterModule, Routes } from "@angular/router";

import { AuthComponent } from './auth.component';
import { AmstoreRegistrationComponent } from './page/registration/amstore-registration.component';
import { AmstoreVerifyComponent } from "./page/verify/amstore-verify.component";
import { EmailLoginComponent } from './page/email-login/email-login.component';


export const routes: Routes = [{
    path: '',
    component: AuthComponent,
    children: [
        {
            path: 'email',
            component: EmailLoginComponent,
        },
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
    imports: [
        RouterModule.forChild(routes),
    ]
})
export class AuthModule {
}
