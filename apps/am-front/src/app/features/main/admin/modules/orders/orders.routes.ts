import { Routes } from '@angular/router';


export const OrdersRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('../placed-orders/list/admin-placed-orders').then(m => m.AdminPlacedOrders),
    },
    {
        path: 'list',
        loadComponent: () => import('./index/index.component').then(m => m.IndexComponent),
    },
    {
        path: 'card/:id',
        loadComponent: () => import('./card/card.component').then(m => m.CardComponent),
    },
    {
        path: ':id',
        loadComponent: () => import('../placed-orders/details/admin-placed-order-details').then(m => m.AdminPlacedOrderDetails),
    },
];
