import { MenuSection } from '@am-front/shared/menu/menu.component';
import { Routes } from '@angular/router';


export const ADMIN_ROUTES_SECTION: MenuSection = {
    color: 'special',
    list: [
        {
            label: 'Размеры',
            path: ['/', 'admin', 'sizes'],
            icon: 'pattern',
            // fontIcon: 'straighten',
        },
        {
            label: 'Категории',
            path: ['/', 'admin', 'categories'],
            icon: 'pattern',
            // fontIcon: 'style',
        },
        {
            label: 'Заказы админа',
            path: ['/', 'admin', 'orders', 'list'],
            icon: 'pattern',
        },
        {
            label: 'Генератор',
            path: ['/', 'admin', 'generator'],
            icon: 'pattern',
        },
    ],
};


export const AdminRoutes: Routes = [
    {
        path: '',
        redirectTo: 'patterns',
        pathMatch: "full",
    },
    {
        path: 'patterns',
        loadChildren: () => import('./modules/patterns/patterns.routes').then(m => m.PatternsRoutes),
    },
    {
        path: 'sizes',
        loadChildren: () => import('./modules/sizes/sizes.routes').then(m => m.SizesRoutes),
    },
    {
        path: 'categories',
        loadChildren: () => import('./modules/categories/categories.routes').then(m => m.CategoriesRoutes),
    },
    {
        path: 'orders',
        loadChildren: () => import('./modules/orders/orders.routes').then(m => m.OrdersRoutes),
    },
    {
        path: 'generator',
        loadComponent: () => import('./modules/number-generator/number-generator.component').then(m => m.NumberGeneratorComponent),
    },
];
