import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AdminGuard } from "@am/core/guards/admin.guard";
import { AuthGuard } from "@am/core/guards/auth.guard";


export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./layouts/store/store.module').then(m => m.StoreModule),
    },
    {
        path: 'account',
        loadChildren: () => import('./layouts/account/account.module').then(m => m.AccountModule),
        canActivate: [AuthGuard],
    },
    {
        path: 'auth',
        loadChildren: () => import('./layouts/auth/auth.module').then(m => m.AuthModule)
    },
    {
        path: 'admin',
        loadChildren: () => import('./layouts/admin/admin.module').then(m => m.AdminModule),
        canActivate: [AdminGuard],
    }
]

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
