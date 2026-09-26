import { MenuSection } from '@am-front/shared/menu/menu.component';
import { Routes } from '@angular/router';
import { JewelryComponent } from '@am-front/root/features/main/store/pages/jewelry/jewelry.component';
import { PatternsComponent } from '@am-front/root/features/main/store/pages/patterns/patterns.component';
import { PatternRoutes } from '@am-front/shared/pages/pattern/pattern.routes';


export const BASE_ROUTES_SECTION: MenuSection = {
    color: 'primary',
    list: [
        {
            label: 'Схемы',
            path: ['/', 'patterns'],
            icon: 'pattern'
        },
        {
            label: 'Украшения',
            path: ['/', 'jewelrys'],
            icon: 'jewelry'
        }
    ]
};

export const StoreRoutes: Routes = [
    {
        path: '',
        redirectTo: 'patterns',
        pathMatch: "full",
    },
    {
        path: 'patterns',
        children: [
            ...PatternRoutes,
            {
                path: '',
                component: PatternsComponent,
            },
        ],
    },
    {
        path: 'jewelrys',
        component: JewelryComponent,
    },
];
