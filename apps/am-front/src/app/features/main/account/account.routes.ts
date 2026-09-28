import { Routes } from '@angular/router';
import { ProfileComponent } from '@am-front/root/features/main/account/pages/profile/profile.component';
import { PatternRoutes } from '@am-front/shared/pages/pattern/pattern.routes';
import { CartComponent } from '@am-front/root/features/main/store/pages/cart/cart.component';
import { OrdersComponent } from '@am-front/root/features/main/account/pages/orders/orders.component';
import { PatternsComponent } from '@am-front/root/features/main/account/pages/patterns/patterns.component';
import { MenuSection } from '@am-front/shared/menu/menu.component';


export const PROFILE_ROUTES_SECTION: MenuSection = {
    color: 'accent',
    list: [
        {
            label: 'Профиль',
            path: ['/', 'account', 'profile'],
            icon: 'profile'
        },
        {
            label: 'Заказы',
            path: ['/', 'account', 'orders'],
            icon: 'order'
        },
        {
            label: 'Схемы',
            path: ['/', 'account', 'patterns'],
            icon: 'pattern'
        }
    ]
};

export const AccountRoutes: Routes = [
    {
        path: '',
        pathMatch: "full",
        redirectTo: 'profile',
    },
    {
        path: 'profile',
        component: ProfileComponent,
        pathMatch: "full",
    },
    {
        path: 'cart',
        children: [
            {
                path: 'pattern',
                children: PatternRoutes,
            },
            {
                path: '',
                component: CartComponent,
            }
        ]
    },
    {
        path: 'orders',
        component: OrdersComponent,
    },
    {
        path: 'patterns',
        component: PatternsComponent,
    },
];
