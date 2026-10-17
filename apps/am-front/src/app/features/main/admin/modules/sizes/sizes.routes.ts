import { Routes } from '@angular/router';


export const SizesRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./sizes/sizes.component').then(m => m.SizesComponent),
    },
    {
        path: 'create',
        loadComponent: () => import('./size-edit/size-edit.component').then(m => m.SizeEditComponent),
    },
    {
        path: 'edit/:id',
        loadComponent: () => import('./size-edit/size-edit.component').then(m => m.SizeEditComponent),
    },
];
