import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AdminGuard } from "@am-front/core/guards/admin.guard";
import { MainComponent } from '@am-front/root/features/main.component';


export const routes: Routes = [
    {
        path: 'auth',
        loadChildren: () => import('@am-front/root/features/auth/auth.module').then(m => m.AuthModule)
    },
    {
        path: '',
        component: MainComponent,
        children: [
            {
                path: 'account',
                loadChildren: () => import('@am-front/root/features/main/account/account.routes')
                    .then(m => m.AccountRoutes)
            },
            {
                path: 'admin',
                loadChildren: () => import('@am-front/root/features/main/admin/admin.routes')
                    .then(m => m.AdminRoutes),
                canActivate: [AdminGuard],
            },
            {
                path: '',
                loadChildren: () => import('@am-front/root/features/main/store/store.routes')
                    .then(m => m.StoreRoutes)
            }
        ],
    },
    {
        path: '**',
        redirectTo: '',
    },
]

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
