import { Routes } from '@angular/router';


export const OrdersRoutes: Routes = [
    {
        path: 'list',
        loadComponent: () => import('./index/index.component').then(m => m.IndexComponent),
    },
    {
        path: 'card/:id',
        loadComponent: () => import('./card/card.component').then(m => m.CardComponent),
    },
];
