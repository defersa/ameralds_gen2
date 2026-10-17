import { Routes } from '@angular/router';


export const CategoriesRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./categories/categories.component').then(m => m.CategoriesComponent),
    },
    {
        path: 'create',
        loadComponent: () => import('./category-edit/category-edit.component').then(m => m.CategoryEditComponent),
    },
    {
        path: 'edit/:id',
        loadComponent: () => import('./category-edit/category-edit.component').then(m => m.CategoryEditComponent),
    },
];
