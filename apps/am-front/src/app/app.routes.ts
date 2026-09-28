import { Routes } from '@angular/router';
import { AdminGuard } from '@am-front/core/guards/admin.guard';
import { MainComponent } from '@am-front/root/features/main.component';
import { AuthGuard } from '@am-front/core/guards/auth.guard';

export const appRoutes: Routes = [
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
                    .then(m => m.AccountRoutes),
                canActivate: [AuthGuard],
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
];
