import { Routes } from '@angular/router';
import { PatternRoutes } from '@am-front/shared/pages/pattern/pattern.routes';


export const PatternsRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./index/patterns.component').then(m => m.PatternsComponent),
    },
    ...PatternRoutes,
];
