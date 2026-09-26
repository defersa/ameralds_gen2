import { MenuSection } from '@am-front/shared/menu/menu.component';
import { Routes } from '@angular/router';


export const ADMIN_ROUTES_SECTION: MenuSection = {
    color: 'special',
    list: [
        {
            label: 'Схемы',
            path: ['/', 'admin', 'patterns'],
            icon: 'pattern',
        },
        {
            label: 'Размеры',
            path: ['/', 'admin', 'sizes'],
            icon: 'pattern',
        },
        {
            label: 'Категории',
            path: ['/', 'admin', 'categories'],
            icon: 'pattern',
        },
        {
            label: 'Корзина',
            path: ['/', 'admin', 'orders', 'cart'],
            icon: 'pattern',
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
        loadChildren: () => import('./modules/patterns/patterns.module').then(m => m.PatternsModule),
    },
    {
        path: 'sizes',
        loadChildren: () => import('./modules/sizes/sizes.module').then(m => m.SizesModule),
    },
    {
        path: 'categories',
        loadChildren: () => import('./modules/categories/categories.module').then(m => m.CategoriesModule),
    },
    {
        path: 'orders',
        loadChildren: () => import('./modules/orders/orders.module').then(m => m.OrdersModule),
    },
    {
        path: 'generator',
        loadComponent: () => import('./modules/number-generator/number-generator.component').then(m => m.NumberGeneratorComponent),
    },
];
